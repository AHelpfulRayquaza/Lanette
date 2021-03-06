import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { IGameFile } from "../types/games";

class PonytasPinataParty extends Game {
	canHit: boolean = false;
	maxRound: number = 10;
	pinataHits: number = 0;
	points = new Map<Player, number>();
	roundHits = new Map<Player, number>();
	roundTimes: number[] = [4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000];

	onSignups() {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onMaxRound() {
		this.say("All Piñatas have been broken!");
	}

	onNextRound() {
		this.roundHits.clear();
		this.pinataHits = 0;
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const text = "A Piñata appeared!";
				this.on(text, () => {
					this.canHit = true;
					this.timeout = setTimeout(() => this.breakPinata(), this.sampleOne(this.roundTimes));
				});
				this.say(text);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	breakPinata() {
		this.say("The Piñata broke!");
		this.canHit = false;
		if (this.pinataHits === 0) {
			this.say("No one hit the Piñata this round!");
		} else {
			for (const id in this.players) {
				const player = this.players[id];
				const roundHits = this.roundHits.get(player);
				if (!roundHits) continue;
				let points = this.points.get(player) || 0;
				const earnedPoints = Math.floor(50 * roundHits / this.pinataHits);
				points += earnedPoints;
				this.points.set(player, points);
				player.say("You earned " + earnedPoints + " points! Your total is now " + points + ".");
			}
		}

		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onEnd() {
		let highestPoints = 0;
		for (const id in this.players) {
			const player = this.players[id];
			const points = this.points.get(player);
			if (!points) continue;
			if (points > highestPoints) {
				this.winners.clear();
				this.winners.set(player, points);
				highestPoints = points;
			} else if (points === highestPoints) {
				this.winners.set(player, points);
			}
		}

		this.winners.forEach((value, player) => {
			this.addBits(player, 500);
		});

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<PonytasPinataParty>> = {
	hit: {
		command(target, room, user) {
			if (!this.canHit) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundHits.has(player)) return false;
			this.roundHits.set(player, this.pinataHits + 1);
			this.pinataHits++;
			return true;
		},
	},
};

export const game: IGameFile<PonytasPinataParty> = {
	aliases: ['ponytas', 'pinataparty', 'ppp'],
	class: PonytasPinataParty,
	commandDescriptions: [Config.commandCharacter + "hit"],
	commands,
	description: "Players try to hit the piñata before it explodes, but hitting later on gives more points!",
	freejoin: true,
	name: "Ponyta's Pinata Party",
	mascot: "Ponyta",
	scriptedOnly: true,
};
