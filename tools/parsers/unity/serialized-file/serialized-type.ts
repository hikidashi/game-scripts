import type { BinaryReader } from '@nishin/reader';
import { DataType, Encoding } from '@nishin/reader';

import { TypeTree } from './type-tree';
import { Version } from './version';

export class SerializedType {
	readonly classId: number;
	readonly isStripped: boolean;
	readonly scriptTypeIndex: number;
	readonly scriptId: number[];
	readonly oldTypeHash: number[];
	readonly tree?: TypeTree;
	readonly reference?: { className: string; namespace: string; asmName: string };
	readonly dependencies?: readonly number[];

	constructor(reader: BinaryReader<Buffer>, version: number, hasTypeTree: boolean, readonly isReferenceType: boolean) {
		this.classId = reader.next(DataType.Int32).value;
		this.isStripped = version >= Version.RefactoredClassId && reader.next(DataType.Boolean).value;
		this.scriptTypeIndex = version >= Version.RefactorTypeData ? reader.next(DataType.Int16).value : -1;

		this.scriptId = [];
		this.oldTypeHash = [];

		if (version >= Version.HasTypeTreeHashes) {
			if (
				(isReferenceType && this.scriptTypeIndex >= 0) ||
				(version < Version.RefactoredClassId && this.classId < 0) ||
				(version >= Version.RefactoredClassId && this.classId === 114)
			) {
				this.scriptId = reader.next(DataType.array(DataType.Uint8, 16)).value;
			}

			this.oldTypeHash = reader.next(DataType.array(DataType.Uint8, 16)).value;
		}

		if (hasTypeTree) {
			this.tree = new TypeTree(reader, version);

			if (version >= Version.StoresTypeDependencies) {
				if (isReferenceType) {
					this.reference = {
						className: reader.next(DataType.string(Encoding.UTF8)).value,
						namespace: reader.next(DataType.string(Encoding.UTF8)).value,
						asmName: reader.next(DataType.string(Encoding.UTF8)).value,
					};
				} else {
					const length = reader.next(DataType.Uint32).value;
					this.dependencies = reader.next(DataType.array(DataType.Int32, length)).value;
				}
			}
		}
	}
}
