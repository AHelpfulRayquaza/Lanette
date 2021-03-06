import { PRNG, PRNGSeed } from "../prng";
import { Room } from "../rooms";
import { assert, assertStrictEqual } from "../test/test-tools";
import { GameFileTests, IGameFile, IGameFormat } from "../types/games";
import { IParam, IParametersResponse, ParamType } from '../workers/parameters';
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_NUMBER_OF_PARAMS = 2;
const MIN_GEN = 1;
const MAX_GEN = 7;

const name = "Paras' Parameters";
const allParamTypes: ParamType[] = ['move', 'tier', 'color', 'type', 'resistance', 'weakness', 'egggroup', 'ability', 'gen'];
let loadedData = false;

export class ParasParameters extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		Games.workers.parameters.loadData();

		loadedData = true;
	}

	currentNumberOfParams: number = 0;
	customParamTypes: ParamType[] | null = null;
	minimumResults: number = 3;
	maximumResults: number = 50;
	params: IParam[] = [];
	paramTypes: ParamType[] = allParamTypes;
	pokemon: string[] = [];
	roundTime: number = 5 * 60 * 1000;
	usesWorkers: boolean = true;

	onInitialize() {
		super.onInitialize();

		const format = this.format as IGameFormat;
		if (format.mode && (format.mode.id === 'survival' || format.mode.id === 'team')) {
			this.paramTypes = ['tier', 'color', 'type', 'egggroup', 'ability', 'gen'];
		}
	}

	onSignups() {
		super.onSignups();
		if (this.isMiniGame) {
			(this.format as IGameFormat).minigameDescription = "Use ``/ds" + this.format.options.gen + "`` to search for and then ``" + Config.commandCharacter + "g`` to guess ``/ds`` parameters that give the following Pokemon!";
		}
	}

	getParamNames(params: IParam[]): string[] {
		const names = [];
		for (let i = 0; i < params.length; i++) {
			if (params[i].type === 'type') {
				names.push(params[i].param + ' type');
			} else if (params[i].type === 'resistance') {
				names.push('Resists ' + params[i].param + ' type');
			} else if (params[i].type === 'weakness') {
				names.push('Weak to ' + params[i].param + ' type');
			} else if (params[i].type === 'gen') {
				names.push("Gen " + params[i].param);
			} else if (params[i].type === 'egggroup') {
				names.push(params[i].param + " Group");
			} else {
				names.push(params[i].param);
			}
		}
		return names.sort();
	}

	async setAnswers() {
		let numberOfParams: number;
		if (this.customParamTypes) {
			numberOfParams = this.customParamTypes.length;
		} else if (this.format.inputOptions.params) {
			numberOfParams = this.format.options.params;
		} else {
			numberOfParams = BASE_NUMBER_OF_PARAMS;
			if ((this.format as IGameFormat).customizableOptions.params) numberOfParams += this.random((this.format as IGameFormat).customizableOptions.params.max - BASE_NUMBER_OF_PARAMS + 1);
		}
		this.currentNumberOfParams = numberOfParams;
		const result = await Games.workers.parameters.search({
			customParamTypes: this.customParamTypes,
			minimumResults: this.minimumResults,
			maximumResults: this.maximumResults,
			mod: 'gen' + this.format.options.gen,
			numberOfParams,
			paramTypes: this.paramTypes,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
			searchType: 'pokemon',
		});

		if (this.ended) return;

		if (!result.pokemon.length) {
			this.say("Invalid params specified.");
			this.deallocate(true);
		} else {
			this.params = result.params;
			this.pokemon = result.pokemon;
			this.prng = new PRNG(result.prngSeed);

			this.answers = [this.getParamNames(result.params).join(',')];
			let oldGen = '';
			if (this.format.options.gen && this.format.options.gen !== Dex.gen) oldGen = " (Generation " + this.format.options.gen + ")";
			this.additionalHintHeader = "- " + this.params.length + " params" + oldGen + ":";

			const pokemonIcons: string[] = [];
			for (let i = 0; i < result.pokemon.length; i++) {
				const pokemon = Dex.getExistingPokemon(result.pokemon[i]);
				pokemonIcons.push(Dex.getPSPokemonIcon(pokemon) + pokemon.species);
			}
			this.hint = "<div class='infobox'>" + pokemonIcons.join(", ") + "</div>";
		}
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		if (!givenAnswer) givenAnswer = Tools.joinList(this.answers[0].split(','));
		return "A possible set of parameters was __" + givenAnswer + "__.";
	}

	async intersect(parts: string[]): Promise<IParametersResponse> {
		const mod = 'gen' + this.format.options.gen;
		const paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		const params: IParam[] = [];
		for (let i = 0; i < parts.length; i++) {
			const part = Tools.toId(parts[i]);
			let param: IParam | undefined;
			for (let i = 0; i < allParamTypes.length; i++) {
				if (part in paramTypePools[allParamTypes[i]]) {
					param = paramTypePools[allParamTypes[i]][part];
					break;
				}
			}
			if (!param) return Promise.resolve({params: [], pokemon: []});
			params.push(param);
		}

		return Games.workers.parameters.intersect({
			mod,
			params,
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		});
	}

	async checkAnswer(guess: string): Promise<string> {
		const parts = guess.split(',');
		if (parts.length === this.currentNumberOfParams) {
			const intersection = await this.intersect(parts);
			if (intersection.pokemon.join(',') === this.pokemon.join(',')) return Tools.joinList(this.getParamNames(intersection.params));
		}
		return "";
	}
}

const tests: GameFileTests<ParasParameters> = {
	'should return proper values from Portmanteaus worker': {
		config: {
			async: true,
		},
		async test(game, format) {
			this.timeout(15000);
			const parametersData = Games.workers.parameters.loadData();

			for (const gen in parametersData.pokemon.gens) {
				const types = Object.keys(parametersData.pokemon.gens[gen].paramTypeDexes) as ParamType[];
				for (let i = 0; i < types.length; i++) {
					const type = types[i];
					const keys = Object.keys(parametersData.pokemon.gens[gen].paramTypeDexes[type]);
					const checkTier = type === 'tier';
					for (let i = 0; i < keys.length; i++) {
						const key = Tools.toId(keys[i]);
						assert(key in parametersData.pokemon.gens[gen].paramTypePools[type], key + ' in ' + type);
						if (checkTier) assert(keys[i].charAt(0) !== '(');
					}
				}
			}

			for (let i = MIN_GEN; i <= MAX_GEN; i++) {
				const gen = i;
				for (let i = format.customizableOptions.params.min; i <= format.customizableOptions.params.max; i++) {
					format.inputOptions.params = i;
					game.format.options.params = i;
					format.inputOptions.gen = gen;
					game.format.options.gen = gen;
					await game.onNextRound();
					assert(game.params.length);
					assert(game.pokemon.length);
				}
			}
			delete format.inputOptions.params;
			delete game.format.options.params;

			game.format.options.gen = 7;
			game.customParamTypes = ['move', 'egggroup'];
			await game.onNextRound();
			assert(game.params.length);
			assert(game.pokemon.length);
			assertStrictEqual(game.params[0].type, 'move');
			assertStrictEqual(game.params[1].type, 'egggroup');
			game.customParamTypes = null;

			let intersection = await game.intersect(['rockclimb', 'steeltype']);
			assertStrictEqual(intersection.pokemon.join(","), "durant,excadrill,ferroseed,ferrothorn,steelix");

			intersection = await game.intersect(['poisontype', 'powerwhip']);
			assertStrictEqual(intersection.pokemon.join(","), "bellsprout,bulbasaur,ivysaur,roselia,roserade,venusaur,victreebel,weepinbell");

			intersection = await game.intersect(['gen1', 'psychic', 'psychictype']);
			assertStrictEqual(intersection.pokemon.join(","), "abra,alakazam,drowzee,exeggcute,exeggutor,hypno,jynx,kadabra,mew,mewtwo,mrmime,slowbro,slowpoke,starmie");

			intersection = await game.intersect(['firetype', 'thunder']);
			assertStrictEqual(intersection.pokemon.join(","), "arceusfire,castformsunny,groudonprimal,hooh,marowakalola,marowakalolatotem,rotomheat,victini");

			intersection = await game.intersect(['darktype', 'refresh']);
			assertStrictEqual(intersection.pokemon.join(","), "arceusdark,carvanha,nuzleaf,sharpedo,shiftry,umbreon");

			intersection = await game.intersect(['monstergroup', 'rockhead']);
			assertStrictEqual(intersection.pokemon.join(","), "aggron,aron,cubone,lairon,marowak,marowakalola,rhydon,rhyhorn,tyrantrum");

			intersection = await game.intersect(['gen6', 'resists ice', 'destiny bond']);
			assertStrictEqual(intersection.pokemon.join(","), "aegislash,doublade,honedge,houndoommega,sharpedomega");

			game.format.options.gen = 6;
			intersection = await game.intersect(['Weak to Rock Type', 'Earthquake']);
			assertStrictEqual(intersection.pokemon.join(","), "abomasnow,aerodactyl,altaria,arceusbug,arceusfire,arceusflying,arceusice,archen,archeops,armaldo,aurorus,avalugg,charizard,crustle,darmanitan,dragonite,dwebble,glalie,gyarados,hooh,lugia,magcargo,magmortar,mantine,mantyke,pineco,pinsir,rayquaza,regice,salamence,scolipede,sealeo,shuckle,spheal,torkoal,tropius,typhlosion,volcanion,walrein");

			intersection = await game.intersect(['Psycho Cut', 'Resists Fighting Type']);
			assertStrictEqual(intersection.pokemon.join(","), "alakazam,cresselia,drowzee,gallade,hypno,kadabra,medicham,meditite,mewtwo");
		},
	},
	'should use proper paramTypes for modes': {
		config: {
			inputTargets: ['params, survival', 'params, team'],
		},
		test(game, format) {
			assertStrictEqual(game.paramTypes.join(','), 'tier,color,type,egggroup,ability,gen');
		},
	},
};

export const game: IGameFile<ParasParameters> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['paras', 'params'],
	category: 'puzzle',
	class: ParasParameters,
	customizableOptions: {
		gen: {min: MIN_GEN, base: MAX_GEN, max: MAX_GEN},
		params: {min: 2, base: BASE_NUMBER_OF_PARAMS, max: 4},
		points: {min: 5, base: 5, max: 10},
	},
	description: "Players search for possible <code>/dexsearch</code> parameters that result in the given Pokemon list!",
	formerNames: ["Parameters"],
	freejoin: true,
	name,
	mascot: "Paras",
	minigameCommand: 'parameter',
	minigameCommandAliases: ['param'],
	modes: ['survival', 'team'],
	tests: Object.assign({}, guessingGame.tests, tests),
});
