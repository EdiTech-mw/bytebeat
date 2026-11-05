export const binaryOperators = new Map([
	['>', '>'],
	['<', '<'],
	['=', '=='],
	['==', '=='],
	['!=', '!='],
	['>=', '>='],
	['<=', '<='],
	['===', '==='],
	['!==', '!=='],
	['+', '+'],
	['-', '-'],
	['*', '*'],
	['/', '/'],
	['%', '%'],
	['**', '**'],
	['>>', '>>'],
	['>>>', '>>>'],
	['<<', '<<'],
	['&', '&'],
	['|', '|'],
	['^', '^'],
	['&&', '&&'],
	['||', '||']
]);

const mathConstants = new Map([
	['e', 'Math.E'],
	['ln2', 'Math.LN2'],
	['ln10', 'Math.LN10'],
	['log2e', 'Math.LOG2E'],
	['log10e', 'Math.LOG10E'],
	['pi', 'Math.PI'],
	['sqrt1_2', 'Math.SQRT1_2'],
	['sqrt2', 'Math.SQRT2']
]);

const unaryOperators = new Set([
	'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cbrt', 'ceil', 'clz32', 'cos', 'cosh',
	'exp', 'expm1', 'floor', 'fround', 'f16round', 'log', 'log10', 'log1p', 'log2', 'round', 'sign', 'sin',
	'sinh', 'sqrt', 'sumPrecise', 'tan', 'tanh', 'trunc'
]);

const customArity = new Map([
	['min', 2], ['max', 2], ['pow', 2], ['atan2', 2], ['imul', 2], ['hypot', 2]
]);

const stackOperators = new Set([
	'drop', 'dup', 'swap', 'pick', 'put', 'over', 'rot', 'nip', 'tuck', '2dup', '2drop', '2swap'
]);

const numberToken = /^(?:0x[\da-f]+|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)$/i;
const identifierToken = /^[A-Za-z_$][\w$]*$/;
const reservedWords = new Set(('break case catch class const continue debugger default delete do else ' +
	'export extends finally for function if import in instanceof let new return super switch this throw ' +
	'try typeof var void while with yield await enum implements interface package private protected public static')
	.split(' '));

const isOperand = token => numberToken.test(token) || identifierToken.test(token) && !reservedWords.has(token);
const resolveConstant = token => mathConstants.get(token) || mathConstants.get(token.toLowerCase());

const unexpectedToken = (format, token) => new SyntaxError(
	`${format}: unexpected token ${JSON.stringify(token)}. Use space-separated ${format} notation ` +
	`(for example, ${format === 'prefix' ? '& t >> t 8' : 't t 8 >> &'}). ` +
	'Choose infix for JavaScript formulas.');

// Resolve aliases to the actual binding, preserving distinct names.
const functionNames = new Map([...unaryOperators, ...customArity.keys()].map(name => [name, name]));
const foldedFunctions = new Map([...functionNames.keys()].map(name => [name.toLowerCase(), name]));

export const resolveFunction = token => functionNames.get(token) || foldedFunctions.get(token.toLowerCase());
export const functionArity = token => customArity.get(token) || customArity.get(token.toLowerCase()) || 1;

const validateExpression = (token, format) => {
	try {
		// Legacy postfix songs may use a JavaScript expression as one operand.
		// Parse it in isolation so malformed tokens cannot break generated calls.
		new Function(`return (\n${token}\n);`);
	} catch {
		throw unexpectedToken(format, token);
	}
};

export const tokenize = (code, format = 'postfix') => {
	const input = String(code);
	const tokens = [], brackets = [];
	let token = '', quote = '';
	const flush = () => { if(token) tokens.push(token); token = ''; };
	for(let i = 0; i < input.length; i++) {
		const char = input[i], next = input[i + 1];
		if(quote) {
			token += char;
			if(char === '\\' && next !== undefined) token += input[++i];
			else if(char === quote) quote = '';
			continue;
		}
		if(char === '/' && (next === '/' || next === '*')) {
			if(next === '/') {
				while(i + 1 < input.length && !/[\r\n]/.test(input[i + 1])) i++;
			} else {
				const end = input.indexOf('*/', i + 2);
				if(end === -1) throw unexpectedToken(format, 'unclosed comment');
				i = end + 1;
			}
			if(brackets.length) token += ' '; else flush();
			continue;
		}
		if(char === '"' || char === "'" || char === '`') quote = char;
		else if('([{'.includes(char)) brackets.push(char);
		else if(')]}'.includes(char)) {
			if(brackets.pop() !== '([{'[')]}'.indexOf(char)]) throw unexpectedToken(format, char);
		}
		if(/\s/.test(char) && !brackets.length && !quote) flush();
		else token += char;
	}
	if(quote || brackets.length) throw unexpectedToken(format, `unclosed ${quote || brackets.at(-1)}`);
	flush();
	return tokens;
};

const wrapIndex = (index, size) => {
	const integer = Math.floor(Number(index));
	return Number.isFinite(integer) ? ((integer % size) + size) % size : 0;
};

export function createPostfixStack(size = 256) {
	let pointer = 0;
	const values = new Array(size).fill(0);
	return {
		pop() {
			pointer = pointer === 0 ? size - 1 : pointer - 1;
			return values[pointer];
		},
		push(value) {
			values[pointer++] = value;
			pointer %= size;
		},
		pick(index) {
			return values[wrapIndex(pointer - Math.floor(index) - 1, size)];
		},
		put(index, value) {
			values[wrapIndex(pointer - Math.floor(index), size)] = value;
		},
		reset() {
			pointer = 0;
			values.fill(0);
		}
	};
}

export function postfixToFunction(code) {
	const steps = [];
	const tokens = tokenize(code);
	const push = value => steps.push(`postfixStack.push(${ value });`);
	for(const token of tokens) {
		const normalizedToken = token.toLowerCase();
		const constantExpr = resolveConstant(token);
		const functionName = resolveFunction(token);

		if(constantExpr) {
			push(constantExpr);
			continue;
		}
		if(isOperand(token) &&
			!binaryOperators.has(token) && !functionName && !stackOperators.has(normalizedToken) &&
			normalizedToken !== 'random' && normalizedToken !== '~') {
			push(token);
			continue;
		}
		if(normalizedToken === '>' || normalizedToken === '<' || normalizedToken === '=') {
			steps.push('var postfixRight = postfixStack.pop();');
			steps.push('var postfixLeft = postfixStack.pop();');
			const comparison = normalizedToken === '>' ? 'postfixRight < postfixLeft' :
				normalizedToken === '<' ? 'postfixRight > postfixLeft' :
				'postfixLeft == postfixRight';
			steps.push(`postfixStack.push((${ comparison }) ? 0xFFFFFFFF : 0);`);
			continue;
		}
		if(binaryOperators.has(token)) {
			steps.push('var postfixRight = postfixStack.pop();');
			steps.push('var postfixLeft = postfixStack.pop();');
			steps.push(`postfixStack.push((postfixLeft ${ binaryOperators.get(token) } postfixRight) | 0);`);
			continue;
		}
		if(normalizedToken === '~') {
			steps.push('postfixStack.push(~postfixStack.pop());');
			continue;
		}
		if(functionName) {
			const arity = functionArity(functionName);
			const args = [];
			while(args.length < arity) {
				const argument = `postfixArg${arity - args.length - 1}`;
				steps.push(`var ${argument} = postfixStack.pop();`);
				args.unshift(argument);
			}
			push(`${ functionName }(${ args.join(',') })`);
			continue;
		}
		if(normalizedToken === 'random') {
			push('random()');
			continue;
		}
		if(normalizedToken === 'dup') {
			push('postfixStack.pick(0)');
			continue;
		}
		if(normalizedToken === 'over') {
			push('postfixStack.pick(1)');
			continue;
		}
		if(normalizedToken === 'drop') {
			steps.push('postfixStack.pop();');
			continue;
		}
		if(normalizedToken === '2drop') {
			steps.push('postfixStack.pop();', 'postfixStack.pop();');
			continue;
		}
		if(normalizedToken === 'pick') {
			steps.push('var postfixIndex = postfixStack.pop();');
			push('postfixStack.pick(postfixIndex)');
			continue;
		}
		if(normalizedToken === 'put') {
			steps.push('var postfixIndex = postfixStack.pop();');
			steps.push('var postfixValue = postfixStack.pick(0);');
			steps.push('postfixStack.put(postfixIndex, postfixValue);');
			continue;
		}
		if(normalizedToken === 'swap') {
			steps.push('var postfixRight = postfixStack.pop();');
			steps.push('var postfixLeft = postfixStack.pop();');
			push('postfixRight');
			push('postfixLeft');
			continue;
		}
		if(normalizedToken === 'nip') {
			steps.push('var postfixRight = postfixStack.pop();');
			steps.push('postfixStack.pop();');
			push('postfixRight');
			continue;
		}
		if(normalizedToken === 'tuck') {
			steps.push('var postfixRight = postfixStack.pop();');
			steps.push('var postfixLeft = postfixStack.pop();');
			push('postfixRight');
			push('postfixLeft');
			push('postfixRight');
			continue;
		}
		if(normalizedToken === 'rot') {
			steps.push('var postfixTop = postfixStack.pop();');
			steps.push('var postfixMiddle = postfixStack.pop();');
			steps.push('var postfixBottom = postfixStack.pop();');
			push('postfixMiddle');
			push('postfixTop');
			push('postfixBottom');
			continue;
		}
		if(normalizedToken === '2dup') {
			push('postfixStack.pick(1)');
			push('postfixStack.pick(1)');
			continue;
		}
		if(normalizedToken === '2swap') {
			steps.push('var postfixTop = postfixStack.pop();');
			steps.push('var postfixNext = postfixStack.pop();');
			steps.push('var postfixThird = postfixStack.pop();');
			steps.push('var postfixBottom = postfixStack.pop();');
			push('postfixThird');
			push('postfixTop');
			push('postfixBottom');
			push('postfixNext');
			continue;
		}
		validateExpression(token, 'postfix');
		push(token);
	}
	if(!tokens.length) return 'return 0;';
	steps.push('return postfixStack.pop();');
	return steps.join('\n');
}

function pop(stack, token) {
	if(stack.length === 0) {
		throw new SyntaxError(`postfix: missing operand for ${ token }`);
	}
	return stack.pop();
}

export function postfixToInfix(code) {
	const stack = [];
	const tokens = tokenize(code);
	for(const token of tokens) {
		const normalizedToken = token.toLowerCase();
		const constantExpr = resolveConstant(token);
		const functionName = resolveFunction(token);

		if(constantExpr) {
			stack.push(constantExpr);
			continue;
		}
		if(isOperand(token) &&
			!binaryOperators.has(token) && !functionName && !stackOperators.has(normalizedToken) &&
			normalizedToken !== 'random' && normalizedToken !== '~') {
			stack.push(token);
			continue;
		}
		if(binaryOperators.has(token)) {
			const right = pop(stack, token);
			const left = pop(stack, token);
			stack.push(`(${ left }${ binaryOperators.get(token) }${ right })`);
			continue;
		}
		if(token === '~') {
			stack.push(`(~${ pop(stack, token) })`);
			continue;
		}
		if(functionName) {
			const arity = functionArity(functionName);
			const args = [];
			while(args.length < arity) {
				args.unshift(pop(stack, token));
			}
			stack.push(`${ functionName }(${ args.join(',') })`);
			continue;
		}
		if(normalizedToken === 'random') {
			stack.push('random()');
			continue;
		}
		if(normalizedToken === 'dup') {
			stack.push(pop(stack, token), stack[stack.length - 1]);
			continue;
		}
		if(normalizedToken === 'over') {
			if(stack.length < 2) pop(stack, token);
			stack.push(stack[stack.length - 2]);
			continue;
		}
		if(normalizedToken === 'drop') {
			pop(stack, token);
			continue;
		}
		if(normalizedToken === '2drop') {
			pop(stack, token);
			pop(stack, token);
			continue;
		}
		if(normalizedToken === 'pick') {
			const index = pop(stack, token);
			if(numberToken.test(index)) {
				const offset = Math.floor(Number(index));
				stack.push(offset >= 0 && offset < stack.length ? stack[stack.length - 1 - offset] : '0');
			} else {
				const values = stack.slice().reverse();
				stack.push(`([${ values.join(',') }][Math.floor(${ index })] ?? 0)`);
			}
			continue;
		}
		if(normalizedToken === 'put') {
			const index = pop(stack, token);
			if(!numberToken.test(index)) {
				throw new SyntaxError(`postfix: dynamic put is not supported for ${ index }`);
			}
			const offset = Math.floor(Number(index));
			if(offset >= 0 && offset < stack.length) {
				stack[stack.length - 1 - offset] = stack[stack.length - 1];
			}
			continue;
		}
		if(normalizedToken === 'swap') {
			const right = pop(stack, token);
			const left = pop(stack, token);
			stack.push(right, left);
			continue;
		}
		if(normalizedToken === 'nip') {
			const right = pop(stack, token);
			pop(stack, token);
			stack.push(right);
			continue;
		}
		if(normalizedToken === 'tuck') {
			const right = pop(stack, token);
			const left = pop(stack, token);
			stack.push(right, left, right);
			continue;
		}
		if(normalizedToken === 'rot') {
			const top = pop(stack, token);
			const middle = pop(stack, token);
			const bottom = pop(stack, token);
			stack.push(middle, top, bottom);
			continue;
		}
		if(normalizedToken === '2dup') {
			if(stack.length < 2) pop(stack, token);
			stack.push(stack[stack.length - 2], stack[stack.length - 1]);
			continue;
		}
		if(normalizedToken === '2swap') {
			const top = pop(stack, token);
			const next = pop(stack, token);
			const third = pop(stack, token);
			const bottom = pop(stack, token);
			stack.push(third, top, bottom, next);
			continue;
		}
		validateExpression(token, 'postfix');
		stack.push(token);
	}
	if(stack.length !== 1) {
		throw new SyntaxError(`postfix: expected one result, got ${ stack.length }`);
	}
	return stack[0];
}

// Prefix notation uses the same operator vocabulary as postfix notation.
export function prefixToPostfix(code) {
	const tokens = tokenize(code, 'prefix');
	const stack = [];
	for(const token of tokens.reverse()) {
		const lower = token.toLowerCase();
		const constantExpr = resolveConstant(token);
		const functionName = resolveFunction(token);
		const arity = binaryOperators.has(token) ? 2 : token === '~' ? 1 :
			functionName ? functionArity(functionName) : 0;

		if(constantExpr) {
			stack.push(token);
			continue;
		}
		if(arity) {
			if(stack.length < arity) throw new SyntaxError(`prefix: missing operand for ${token}`);
			const args = [];
			for(let i = 0; i < arity; i++) args.push(stack.pop());
			stack.push(`${args.join(' ')} ${token}`);
		} else {
			if(stackOperators.has(lower)) {
				throw unexpectedToken('prefix', token);
			}
			if(!isOperand(token)) validateExpression(token, 'prefix');
			stack.push(token);
		}
	}
	if(!stack.length) return '0';
	if(stack.length !== 1) throw new SyntaxError('prefix: expected one expression');
	return stack[0];
}
