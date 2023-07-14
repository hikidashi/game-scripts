type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

/* prettier-ignore */
type DeepMutable<T> =
	T extends ReadonlyArray<infer U> ? Array<DeepMutable<U>> :
	T extends object ? { -readonly [P in keyof T]: DeepMutable<T[P]> } :
	T;

type ReadonlyDict<T> = Readonly<Record<string, T>>;

type NTuple<T, N extends number, A extends unknown[] = []> = A extends { length: N } ? A : NTuple<T, N, [...A, T]>;

type NRecord<K extends PropertyKey, V, N extends number, A extends unknown[] = NTuple<void, N>> = N extends 1
	? Record<K, V>
	: A extends [unknown, ...infer R]
	? Record<K, NRecord<K, V, R['length'], R>>
	: never;

type LocalizedRecord<T> = {
	readonly [key: string]: T;
	readonly '*': T;
};

type Platform = 'PC' | 'Switch' | 'Wii';

type DataTree = {
	[key: string]: DataTree | null;
};

interface GameEntry {
	readonly id: string;
	readonly title: LocalizedRecord<string>;
	readonly platform: Platform;
	readonly version: string;
	readonly dataTree: DataTree;
	readonly locales: readonly string[];
	readonly ruby?: readonly string[];
	readonly characters?: {
		readonly [key: string]: LocalizedRecord<string>;
	};
}
