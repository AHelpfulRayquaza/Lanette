import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Slowking's Trivia";
const data: {"Pokemon Abilities": Dict<string[]>, "Pokemon Items": Dict<string[]>, "Pokemon Moves": Dict<string[]>} = {
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
const categoryKeys: KeyedDict<typeof data, string[]> = {
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
let loadedData = false;

const achievements: AchievementsDict = {
	'knowitall': {name: "Know-It-All", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	'captainknowitall': {name: "Captain Know-It-All", type: 'all-answers-team', bits: 1000, description: "get every answer for your team and win"},
};

class SlowkingsTrivia extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const abilities = Games.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			const ability = abilities[i];
			const desc = ability.desc || ability.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Abilities"])) data["Pokemon Abilities"][desc] = [];
			data["Pokemon Abilities"][desc].push(ability.name);
		}

		const items = Games.getItemsList();
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const desc = item.desc || item.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Items"])) data["Pokemon Items"][desc] = [];
			data["Pokemon Items"][desc].push(item.name);
		}

		const moves = Games.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			const desc = move.desc || move.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Moves"])) data["Pokemon Moves"][desc] = [];
			data["Pokemon Moves"][desc].push(move.name);
		}

		for (let i = 0; i < categories.length; i++) {
			categoryKeys[categories[i]] = Object.keys(data[categories[i]]);
		}

		loadedData = true;
	}

	allAnswersAchievement = achievements.knowitall;
	allAnswersTeamAchievement = achievements.captainknowitall;

	async setAnswers() {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		const description = this.sampleOne(categoryKeys[category]);
		this.answers = data[category][description];
		this.hint = "<b>" + category + "</b>: <i>" + description + "</i>";
	}
}

export const game: IGameFile<SlowkingsTrivia> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ['slowkings', 'triv', 'st'],
	category: 'knowledge',
	class: SlowkingsTrivia,
	defaultOptions: ['points'],
	description: "Players use the given descriptions (Pokemon related) to guess the answers!",
	formerNames: ["Trivia"],
	freejoin: true,
	name,
	mascot: "Slowking",
	minigameCommand: 'trivium',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer based on the description!",
	modes: ["survival", "team"],
	variants: [
		{
			name: "Slowking's Ability Trivia",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Slowking's Item Trivia",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Slowking's Move Trivia",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
	],
});
