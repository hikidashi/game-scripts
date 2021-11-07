import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { NRecord } from '../../../types';
import { Alignment, fieldAlignment, ragtimeAlignment, ragtimeFiles } from './alignments';
import { eventMessageMap } from './assembly-data';

const assetsRoot = `data/final-fantasy-9/extract/embeddedasset`;
const textRoot = path.join(assetsRoot, 'text');

export const raw = readdirSync(textRoot).reduce<NRecord<string, string, 3>>((result, locale) => {
	const categories: NRecord<string, string, 2> = Object.create(null);

	readdirSync(path.join(textRoot, locale)).forEach((category) => {
		const messages: Record<string, string> = Object.create(null);

		readdirSync(path.join(textRoot, locale, category)).forEach((file) => {
			const message = readFileSync(path.join(textRoot, locale, category, file), 'utf-8');
			messages[file] = message;
		});

		categories[category] = messages;
	});

	result[locale] = categories;

	return result;
}, Object.create(null));

const localeMap: Record<string, string> = {
	es: 'es-ES',
	fr: 'fr-FR',
	gr: 'de-DE',
	it: 'it-IT',
	jp: 'ja-JP',
	uk: 'en-GB',
	us: 'en-US',
};

const align = (source: Record<string, string[]>, data: Alignment): Array<Record<string, string>> => {
	const rows = Array.from({ length: data.max }).map((_, index) =>
		Object.entries(source).reduce<Record<string, string>>((result, [locale, messages]) => {
			const l = localeMap[locale];
			if (data.blanks?.[locale]?.includes(index)) {
				result[l] = '';
			} else {
				result[l] = messages.shift() ?? '';
			}

			return result;
		}, Object.create(null)),
	);

	Object.keys(source).forEach((locale) => {
		data.swap?.[locale]?.forEach(([a, b]) => {
			const l = localeMap[locale];
			[rows[a][l], rows[b][l]] = [rows[b][l], rows[a][l]];
		});
	});

	return rows.filter((row) => Object.values(row).some((message) => message.trim()));
};

const simpleSplit = (source: string) =>
	Object.keys(raw.jp[source]).reduce<Record<string, Array<Record<string, string>>>>((result, file) => {
		const main = result[file] ?? [];

		Object.keys(raw).forEach((locale) => {
			raw[locale][source][file].split(/(?<=\[ENDN\])/).forEach((name, index) => {
				const row = main[index] ?? {};
				row[localeMap[locale]] =
					file === 'follow.mes' && index >= 8 ? name.slice(1).replace(/%|&/, `<span class="placeholder">＃</span>`) : name;
				main[index] = row;
			});
		});

		result[file] = main;

		return result;
	}, Object.create(null));

const fieldOrder = [1, ...new Set(Object.values(eventMessageMap))];

export const aligned = {
	field: Object.fromEntries(
		Object.keys(raw.jp.field)
			.map((file) => {
				const data = Object.keys(raw).reduce<Record<string, string[]>>((result, locale) => {
					const messages = raw[locale].field[file]?.split(/(?<=\[(?:ENDN|TIME=-?\d+?)\])/);

					if (messages) {
						result[locale] = messages;
					}

					return result;
				}, Object.create(null));

				if (file in fieldAlignment) {
					return [file, align(data, fieldAlignment[file])] as const;
				}

				return [file, align(data, { max: data.jp.length })] as const;
			})
			.sort(([a], [b]) => {
				const lookup = (value: string) => (id: number) => new RegExp(`^${id}m?\\.mes$`).test(value);
				return fieldOrder.findIndex(lookup(a)) - fieldOrder.findIndex(lookup(b));
			}),
	),
	item: simpleSplit('item'),
	keyitem: simpleSplit('keyitem'),
	ability: simpleSplit('ability'),
	command: simpleSplit('command'),
	battle: Object.fromEntries(
		Object.keys(raw.jp.battle)
			.filter((file) => file.endsWith('.mes'))
			.map((file) => {
				const data = Object.keys(raw).reduce<Record<string, string[]>>((result, locale) => {
					result[locale] = raw[locale].battle[file].split(/(?<=\[ENDN\])/);
					return result;
				}, Object.create(null));

				if (ragtimeFiles.includes(file)) {
					return [file, align(data, ragtimeAlignment)] as const;
				}

				return [file, align(data, { max: data.jp.length })] as const;
			})
			.sort(([a], [b]) => a.localeCompare(b, 'en-US', { numeric: true })),
	),
	location: {
		'loc_name.mes': Object.keys(raw).reduce<NRecord<string, string, 2>>((result, locale) => {
			raw[locale].location['loc_name.mes']
				.split(/(?<=\[ENDN\]\r\n)/)
				.sort((a, b) => a.localeCompare(b, 'en-US', { numeric: true }))
				.forEach((value) => {
					const [index, name] = value.split(':');
					const data = result[index] ?? {};
					data[localeMap[locale]] = name.trim();
					result[index] = data;
				});

			return result;
		}, Object.create(null)),
	},
	etc: simpleSplit('etc'),
};