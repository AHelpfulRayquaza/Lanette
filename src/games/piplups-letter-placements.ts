import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Piplup's Letter Placements";
const data: {'Characters': string[], 'Locations': string[], 'Pokemon': string[], 'Pokemon Abilities': string[], 'Pokemon Items': string[], 'Pokemon Moves': string[]} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

class PiplupsLetterPlacements extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Characters"] = Dex.data.characters.filter(x => x.length > 3);
		data["Locations"] = Dex.data.locations.filter(x => x.length > 3);
		data["Pokemon"] = Games.getPokemonList(x => x.species.length > 3).map(x => x.species);
		data["Pokemon Abilities"] = Games.getAbilitiesList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList(x => x.name.length > 3).map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList(x => x.name.length > 3).map(x => x.name);

		loadedData = true;
	}

	lastAnswer: string = '';

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = Tools.toId(this.sampleOne(data[category]));
		while (answer === this.lastAnswer) {
			answer = Tools.toId(this.sampleOne(data[category]));
		}
		this.lastAnswer = answer;
		const startingPosition = this.random(answer.length - 2);
		const letters = answer.substr(startingPosition, 3);
		if (Client.willBeFiltered(letters, this.isPm(this.room) ? undefined : this.room)) {
			await this.setAnswers();
			return;
		}

		this.answers = [];
		for (let i = 0; i < data[category].length; i++) {
			if (Tools.toId(data[category][i]).includes(letters)) this.answers.push(data[category][i]);
		}

		this.hint = '<b>' + category + '</b>: <i>' + letters + '</i>';
	}
}

export const game: IGameFile<PiplupsLetterPlacements> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["piplups", "plp"],
	category: 'identification',
	class: PiplupsLetterPlacements,
	defaultOptions: ['points'],
	description: "Players guess answers that contain the given letters back-to-back!",
	freejoin: true,
	name,
	mascot: "Piplup",
	modes: ['survival', 'team'],
	minigameCommand: 'placement',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess an answer that contains the given letters back-to-back!',
	variants: [
		{
			name: "Piplup's Ability Letter Placements",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Piplup's Character Letter Placements",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Piplup's Item Letter Placements",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Piplup's Location Letter Placements",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Piplup's Move Letter Placements",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Piplup's Pokemon Letter Placements",
			variant: "Pokemon",
		},
	],
});
