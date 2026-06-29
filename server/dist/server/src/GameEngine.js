import { ALLOWED_USERS, ADMIN_USERNAME, } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';
const TIMERS = { night: 60, day: 240, voting: 240 };
function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
export class GameEngine {
    roomId;
    phase = 'LOBBY';
    players = new Map();
    roleConfig = { mafia: 2, doctor: 1, detective: 1 };
    voiceChatEnabled = false;
    timerEndsAt = null;
    timerPhase = null;
    dayResult = null;
    votingResult = null;
    winner = null;
    round = 0;
    nightActions = {};
    votes = new Map();
    timerHandle = null;
    onPhaseChange;
    constructor(roomId, onPhaseChange) {
        this.roomId = roomId;
        this.onPhaseChange = onPhaseChange;
    }
    setPhaseChangeCallback(cb) {
        this.onPhaseChange = cb;
    }
    isAdmin(username) {
        return username === ADMIN_USERNAME;
    }
    canAdminAct() {
        return this.phase === 'LOBBY' || this.phase === 'ENDED';
    }
    addPlayer(username, socketId, asSpectator = false) {
        const existing = [...this.players.values()].find((p) => p.username === username);
        if (existing) {
            existing.socketId = socketId;
            return existing;
        }
        const player = {
            id: uuidv4(),
            username,
            socketId,
            status: 'alive',
            ready: false,
            isSpectator: asSpectator,
        };
        this.players.set(player.id, player);
        return player;
    }
    removePlayerBySocket(socketId) {
        for (const [id, p] of this.players) {
            if (p.socketId === socketId) {
                if (this.phase === 'LOBBY' || this.phase === 'ENDED') {
                    this.players.delete(id);
                }
                return p;
            }
        }
        return null;
    }
    reconnectPlayer(playerId, socketId) {
        const p = this.players.get(playerId);
        if (!p)
            return null;
        p.socketId = socketId;
        return p;
    }
    getPlayerById(playerId) {
        return this.players.get(playerId);
    }
    kickPlayer(playerId) {
        if (!this.canAdminAct())
            return false;
        return this.players.delete(playerId);
    }
    setReady(playerId, ready) {
        const p = this.players.get(playerId);
        if (!p || p.isSpectator || this.phase !== 'LOBBY')
            return false;
        p.ready = ready;
        return true;
    }
    setRoleConfig(config) {
        if (!this.canAdminAct())
            return false;
        const active = this.getActivePlayers();
        const civilians = active.length - config.mafia - config.doctor - config.detective;
        if (civilians < 0)
            return false;
        this.roleConfig = config;
        return true;
    }
    toggleVoiceChat(enabled) {
        if (!this.canAdminAct())
            return false;
        this.voiceChatEnabled = enabled;
        return true;
    }
    getActivePlayers() {
        return [...this.players.values()].filter((p) => !p.isSpectator);
    }
    getAlivePlayers() {
        return this.getActivePlayers().filter((p) => p.status === 'alive');
    }
    canStartGame() {
        const active = this.getActivePlayers();
        const total = this.roleConfig.mafia +
            this.roleConfig.doctor +
            this.roleConfig.detective;
        const civilians = active.length - total;
        if (civilians < 0)
            return false;
        if (active.length < 4)
            return false;
        return active.every((p) => p.ready);
    }
    startGame() {
        if (!this.canAdminAct() || !this.canStartGame())
            return false;
        this.assignRoles();
        this.phase = 'NIGHT';
        this.round = 1;
        this.nightActions = {};
        this.votes.clear();
        this.dayResult = null;
        this.votingResult = null;
        this.winner = null;
        this.startTimer('night');
        return true;
    }
    endGame() {
        if (!this.canAdminAct())
            return false;
        this.clearTimer();
        this.phase = 'ENDED';
        this.winner = null;
        for (const p of this.getActivePlayers()) {
            p.ready = false;
            p.status = 'alive';
            delete p.role;
        }
        return true;
    }
    restartSession() {
        if (!this.canAdminAct())
            return false;
        this.clearTimer();
        this.phase = 'LOBBY';
        this.round = 0;
        this.nightActions = {};
        this.votes.clear();
        this.dayResult = null;
        this.votingResult = null;
        this.winner = null;
        for (const p of this.getActivePlayers()) {
            p.ready = false;
            p.status = 'alive';
            delete p.role;
        }
        return true;
    }
    assignRoles() {
        const active = shuffle(this.getActivePlayers());
        const roles = [];
        for (let i = 0; i < this.roleConfig.mafia; i++)
            roles.push('mafia');
        for (let i = 0; i < this.roleConfig.doctor; i++)
            roles.push('doctor');
        for (let i = 0; i < this.roleConfig.detective; i++)
            roles.push('detective');
        while (roles.length < active.length)
            roles.push('civilian');
        const shuffledRoles = shuffle(roles);
        active.forEach((p, i) => {
            p.role = shuffledRoles[i];
            p.status = 'alive';
        });
        this.phase = 'ROLE_ASSIGNMENT';
    }
    getRoleAssignment(playerId) {
        const p = this.players.get(playerId);
        if (!p?.role)
            return null;
        if (p.role === 'mafia') {
            const partners = [...this.players.values()]
                .filter((x) => x.role === 'mafia' && x.id !== playerId)
                .map((x) => x.username);
            return { role: p.role, mafiaPartners: partners };
        }
        return { role: p.role };
    }
    beginNightAfterReveal() {
        if (this.phase !== 'ROLE_ASSIGNMENT')
            return;
        this.phase = 'NIGHT';
        this.nightActions = {};
        this.startTimer('night');
    }
    submitMafiaAction(playerId, targetId) {
        if (this.phase !== 'NIGHT')
            return false;
        const p = this.players.get(playerId);
        if (!p || p.role !== 'mafia' || p.status !== 'alive' || p.isSpectator)
            return false;
        const target = this.players.get(targetId);
        if (!target || target.status !== 'alive' || target.isSpectator)
            return false;
        this.nightActions.mafiaTarget = targetId;
        return true;
    }
    submitDoctorAction(playerId, targetId) {
        if (this.phase !== 'NIGHT')
            return false;
        const p = this.players.get(playerId);
        if (!p || p.role !== 'doctor' || p.status !== 'alive' || p.isSpectator)
            return false;
        const target = this.players.get(targetId);
        if (!target || target.status !== 'alive' || target.isSpectator)
            return false;
        this.nightActions.doctorTarget = targetId;
        return true;
    }
    submitDetectiveAction(playerId, targetId) {
        if (this.phase !== 'NIGHT')
            return false;
        const p = this.players.get(playerId);
        if (!p || p.role !== 'detective' || p.status !== 'alive' || p.isSpectator)
            return false;
        const target = this.players.get(targetId);
        if (!target || target.status !== 'alive' || target.isSpectator)
            return false;
        this.nightActions.detectiveTarget = targetId;
        return true;
    }
    resolveNight() {
        const { mafiaTarget, doctorTarget, detectiveTarget } = this.nightActions;
        let deathResult = null;
        let mafiaResult = 'none';
        let doctorResult = 'none';
        let detectiveResult = 'none';
        let detectiveTargetName;
        if (mafiaTarget) {
            mafiaResult = doctorTarget === mafiaTarget ? 'fail' : 'success';
        }
        if (doctorTarget) {
            doctorResult = mafiaTarget === doctorTarget ? 'success' : 'fail';
        }
        if (detectiveTarget) {
            const target = this.players.get(detectiveTarget);
            if (target) {
                detectiveTargetName = target.username;
                detectiveResult = target.role === 'mafia' ? 'correct' : 'incorrect';
            }
        }
        if (mafiaTarget && mafiaTarget !== doctorTarget) {
            const victim = this.players.get(mafiaTarget);
            if (victim) {
                victim.status = 'dead';
                deathResult = { playerId: victim.id, username: victim.username };
            }
        }
        const result = {
            mafiaResult,
            doctorResult,
            detectiveResult,
            detectiveTargetName,
            detectiveActed: Boolean(detectiveTarget),
            deathResult,
        };
        this.dayResult = result;
        this.phase = 'DAY';
        this.startTimer('day');
        return result;
    }
    submitVote(voterId, targetId) {
        if (this.phase !== 'VOTING')
            return false;
        const voter = this.players.get(voterId);
        if (!voter || voter.status !== 'alive' || voter.isSpectator)
            return false;
        const target = this.players.get(targetId);
        if (!target || target.status !== 'alive' || target.isSpectator)
            return false;
        this.votes.set(voterId, targetId);
        return true;
    }
    resolveVoting() {
        const voteCounts = {};
        for (const targetId of this.votes.values()) {
            voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
        }
        const entries = Object.entries(voteCounts);
        if (entries.length === 0) {
            const result = {
                eliminatedPlayerId: null,
                eliminatedUsername: null,
                voteCounts: {},
                tie: false,
            };
            this.votingResult = result;
            return result;
        }
        const maxVotes = Math.max(...entries.map(([, c]) => c));
        const top = entries.filter(([, c]) => c === maxVotes);
        if (top.length > 1) {
            const pick = top[Math.floor(Math.random() * top.length)];
            return this.eliminateFromVote(pick[0], voteCounts, true);
        }
        return this.eliminateFromVote(top[0][0], voteCounts, false);
    }
    eliminateFromVote(playerId, voteCounts, tie) {
        const p = this.players.get(playerId);
        if (p)
            p.status = 'dead';
        const result = {
            eliminatedPlayerId: playerId,
            eliminatedUsername: p?.username ?? null,
            voteCounts,
            tie,
        };
        this.votingResult = result;
        return result;
    }
    checkWin() {
        const alive = this.getAlivePlayers();
        const mafiaCount = alive.filter((p) => p.role === 'mafia').length;
        const civilianSide = alive.filter((p) => p.role !== 'mafia').length;
        if (mafiaCount === 0)
            return 'civilians';
        if (mafiaCount >= civilianSide)
            return 'mafia';
        return null;
    }
    advanceAfterVoting() {
        const win = this.checkWin();
        if (win) {
            this.winner = win;
            this.phase = 'ENDED';
            this.clearTimer();
            return 'ENDED';
        }
        this.round += 1;
        this.phase = 'NIGHT';
        this.nightActions = {};
        this.votes.clear();
        this.dayResult = null;
        this.votingResult = null;
        this.startTimer('night');
        return 'NIGHT';
    }
    advanceDayToVoting() {
        if (this.phase !== 'DAY')
            return;
        this.phase = 'VOTING';
        this.votes.clear();
        this.startTimer('voting');
    }
    startTimer(phase) {
        this.clearTimer();
        const seconds = TIMERS[phase];
        this.timerPhase = phase;
        this.timerEndsAt = Date.now() + seconds * 1000;
        this.timerHandle = setTimeout(() => this.onTimerEnd(phase), seconds * 1000);
    }
    onTimerEnd(phase) {
        if (this.timerPhase !== phase)
            return;
        if (phase === 'night') {
            this.resolveNight();
        }
        else if (phase === 'day') {
            this.advanceDayToVoting();
        }
        else if (phase === 'voting') {
            this.resolveVoting();
            this.advanceAfterVoting();
        }
        this.onPhaseChange?.();
    }
    clearTimer() {
        if (this.timerHandle) {
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
        this.timerEndsAt = null;
        this.timerPhase = null;
    }
    getDetectiveInvestigationResult(targetId) {
        const target = this.players.get(targetId);
        if (!target)
            return null;
        return {
            targetUsername: target.username,
            result: target.role === 'mafia' ? 'correct' : 'incorrect',
        };
    }
    getDetectivePlayer() {
        return [...this.players.values()].find((p) => p.role === 'detective' && p.status === 'alive');
    }
    toPublicDayResult(result) {
        return {
            mafiaResult: result.mafiaResult,
            doctorResult: result.doctorResult,
            detectiveActed: result.detectiveActed,
            deathResult: result.deathResult,
        };
    }
    getPublicState() {
        return {
            roomId: this.roomId,
            phase: this.phase,
            players: [...this.players.values()].map((p) => ({
                id: p.id,
                username: p.username,
                status: p.status,
                ready: p.ready,
                isSpectator: p.isSpectator,
            })),
            roleConfig: { ...this.roleConfig },
            voiceChatEnabled: this.voiceChatEnabled,
            timerEndsAt: this.timerEndsAt,
            timerPhase: this.timerPhase,
            dayResult: this.dayResult ? this.toPublicDayResult(this.dayResult) : null,
            votingResult: this.votingResult,
            winner: this.winner,
            round: this.round,
        };
    }
    getRemainingSeconds() {
        if (!this.timerEndsAt)
            return 0;
        return Math.max(0, Math.ceil((this.timerEndsAt - Date.now()) / 1000));
    }
}
export function isAllowedUser(username) {
    return ALLOWED_USERS.includes(username);
}
