import { assert } from './../test-tools';

describe("CommandParser", () => {
	it('should have commands with only 1 function type each', () => {
		for (const i in Commands) {
			assert(Commands[i].asyncCommand || Commands[i].command);
			assert(!(Commands[i].asyncCommand && Commands[i].command));
		}
	});
});
