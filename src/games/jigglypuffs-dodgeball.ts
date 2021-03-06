import { ICommandDefinition } from "../command-parser";
import { Player, PlayerTeam } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

const BALL_POKEMON = "Igglybuff";

class JigglypuffsDodgeball extends Game {
	throwTime: boolean = false;
	queue: {source: Player, target: Player}[] = [];
	renameDQs: Player[] = [];
	roundActions = new Map<Player, boolean>();
	shields = new Map<Player, boolean>();
	teams: Dict<PlayerTeam> = {};

	onRenamePlayer(player: Player, oldId: string) {
		if (!this.started || player.eliminated) return;
		this.removePlayer(player.name, true);
		this.say(player.name + " was DQed for changing names!");
		this.renameDQs.push(player);
	}

	onStart() {
		this.teams = this.generateTeams(2);
		for (const i in this.teams) {
			const players = this.teams[i].players;
			for (let i = 0; i < players.length; i++) {
				players[i].say("**Your team**: " + Tools.joinList(players.filter(x => x !== players[i]).map(x => x.name)));
			}
		}

		this.nextRound();
	}

	onNextRound() {
		this.throwTime = false;
		if (this.round > 1) {
			this.shields.clear();
			let caughtBall = false;
			for (let i = 0; i < this.queue.length; i++) {
				const player = this.queue[i].source;
				const targetPlayer = this.queue[i].target;
				if (player.team === targetPlayer.team) continue;
				this.shields.set(player, true);
				if (this.shields.has(targetPlayer) || targetPlayer.eliminated) continue;
				if (!caughtBall && !this.random(4)) {
					caughtBall = true;
					const eliminatedTeammates: Player[] = [];
					for (let i = 0; i < targetPlayer.team!.players.length; i++) {
						const teammate = targetPlayer.team!.players[i];
						if (teammate.eliminated && !this.renameDQs.includes(teammate)) {
							eliminatedTeammates.push(teammate);
						}
					}
					const revived = eliminatedTeammates.length ? this.sampleOne(eliminatedTeammates) : null;
					if (revived) {
						revived.eliminated = false;
					}
					this.say(targetPlayer.name + " caught " + player.name + "'s " + BALL_POKEMON + (revived ? " and brought " + revived.name + " back into the game" : "") + "!");
					this.shields.set(targetPlayer, true);
				} else {
					this.eliminatePlayer(targetPlayer, "You were hit by " + this.queue[i].source.name + "'s " + BALL_POKEMON + "!");
				}
			}

			if (this.getRemainingPlayerCount() === 1) return this.end();

			let remainingTeams = 0;
			for (const i in this.teams) {
				if (this.getRemainingPlayerCount(this.teams[i].players) >= 1) remainingTeams++;
			}
			if (remainingTeams === 1) return this.end();
		}

		this.roundActions.clear();
		this.queue = [];

		const html = this.getRoundHtml(() => this.getTeamPlayerNames(this.teams), undefined, undefined, "Remaining team players");
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const time = this.sampleOne([8000, 9000, 10000]);
			const text = "**THROW**";
			this.on(text, () => {
				this.throwTime = true;
				this.timeout = setTimeout(() => this.nextRound(), (3 * 1000) + time);
			});
			this.timeout = setTimeout(() => this.say(text), time);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		let team: PlayerTeam | undefined;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			team = this.players[i].team!;
			break;
		}

		if (team) {
			for (let i = 0; i < team.players.length; i++) {
				this.winners.set(team.players[i], 1);
			}
			this.winners.forEach((value, player) => {
				let earnings = 250;
				if (!player.eliminated) earnings *= 2;
				this.addBits(player, earnings);
			});
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<JigglypuffsDodgeball>> = {
	throw: {
		command(target, room, user) {
			if (!(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			this.roundActions.set(player, true);
			if (!this.throwTime) return false;
			const targetPlayer = this.players[Tools.toId(target)];
			if (!targetPlayer || targetPlayer === player) return false;
			this.queue.push({"target": targetPlayer, "source": player});
			return true;
		},
	},
};

export const game: IGameFile<JigglypuffsDodgeball> = {
	aliases: ["jigglypuffs", "dodgeball"],
	category: 'reaction',
	commandDescriptions: [Config.commandCharacter + "throw [player]"],
	commands,
	class: JigglypuffsDodgeball,
	description: "Players await Jigglypuff's <code>THROW</code> signal to eliminate the opposing team with their " + BALL_POKEMON + "!",
	name: "Jigglypuff's Dodgeball",
	mascot: "Jigglypuff",
};
