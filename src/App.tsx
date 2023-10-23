import { KolButton } from '@public-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { HARD_SUDOKU, SUDOKUS, SolutionValue, Value, createSudoku } from './Sudokus';
import { solveSudoku } from './ChatGPT';

type TryTree = {
	blockList: Value[][][];
	colIndex: number;
	parent: TryTree;
	rowIndex: number;
	value: SolutionValue;
	values: Value[][];
} | null;

type SudokuState = {
	values: Value[][];
	blockList: Value[][][];
	tryValue: TryTree;
};

function countValuesInArray(arr: any[]): number {
	let count = 0;
	for (const item of arr) {
		if (Array.isArray(item)) {
			count += countValuesInArray(item);
		} else {
			count++;
		}
	}
	return count;
}

const POSSIBLE_VALUES: SolutionValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const bigBrain = (values: Value[][], row: number, col: number): SolutionValue[] => {
	const possibleValues = createClone(POSSIBLE_VALUES);
	values[row].forEach((colValue) => {
		if (possibleValues.includes(colValue as SolutionValue)) {
			possibleValues.splice(possibleValues.indexOf(colValue as SolutionValue), 1);
		}
	});
	values[row].forEach((_colValue, rowIndex) => {
		const value = values[rowIndex][col];
		if (possibleValues.includes(value as SolutionValue)) {
			possibleValues.splice(possibleValues.indexOf(value as SolutionValue), 1);
		}
	});

	let startRow = 0;
	let startCol = 0;
	if (row >= 3 && row < 6) {
		startRow = 3;
	} else if (row >= 6) {
		startRow = 6;
	}
	if (col >= 3 && col < 6) {
		startCol = 3;
	} else if (col >= 6) {
		startCol = 6;
	}
	const endRow = startRow + 3;
	const endCol = startCol + 3;

	values.forEach((rowValues, rowIndex) => {
		if (rowIndex >= startRow && rowIndex < endRow) {
			rowValues.forEach((colValue, colIndex) => {
				if (colIndex >= startCol && colIndex < endCol) {
					if (possibleValues.includes(colValue as SolutionValue)) {
						possibleValues.splice(possibleValues.indexOf(colValue as SolutionValue), 1);
					}
				}
			});
		}
	});

	if (values[row][col] !== 0) {
		possibleValues.push(values[row][col] as SolutionValue);
	}
	return possibleValues;
};

const calculatePossibleValues = (values: Value[][], blockList: Value[][][]) => {
	const possibleValues: SolutionValue[][][] = [];
	values.forEach((_, rowIndex) => {
		values[rowIndex].forEach((_, colIndex) => {
			possibleValues[rowIndex] = possibleValues[rowIndex] ?? [];
			possibleValues[rowIndex][colIndex] = bigBrain(values, rowIndex, colIndex);
			if (blockList[rowIndex] && blockList[rowIndex][colIndex]) {
				blockList[rowIndex][colIndex].forEach((blockValue) => {
					if (possibleValues[rowIndex][colIndex].includes(blockValue as SolutionValue)) {
						possibleValues[rowIndex][colIndex].splice(possibleValues[rowIndex][colIndex].indexOf(blockValue as SolutionValue), 1);
					}
				});
			}
		});
	});
	return possibleValues;
};

let timeout: ReturnType<typeof setTimeout>;

const createClone = (obj: any) => JSON.parse(JSON.stringify(obj));

function App() {
	const sudoku: SudokuState = {
		blockList: [],
		tryValue: null,
		values: HARD_SUDOKU,
	};
	try {
		const sudoku = JSON.parse(localStorage.getItem('values') as string) as SudokuState;
		if (sudoku.values.length !== 9) {
			throw new Error('Invalid Sudoku');
		}
	} catch (error) {
		localStorage.removeItem('values');
	}

	const [values, setValues] = useState<SudokuState>(sudoku);
	const [initialValues, setInitialValues] = useState<SudokuState>(createClone(values));
	const [autoSolve, setAutoSolve] = useState<boolean>(false);

	const handleButtonClick = (rowIndex: number, colIndex: number) => {
		const currentValues = createClone(values.values);
		const currentPossibleValues = [0, ...possibleValues[rowIndex][colIndex]];

		let nextValue = currentValues[rowIndex][colIndex];
		do {
			switch (nextValue) {
				case 0:
					nextValue = 1;
					break;
				case 1:
					nextValue = 2;
					break;
				case 2:
					nextValue = 3;
					break;
				case 3:
					nextValue = 4;
					break;
				case 4:
					nextValue = 5;
					break;
				case 5:
					nextValue = 6;
					break;
				case 6:
					nextValue = 7;
					break;
				case 7:
					nextValue = 8;
					break;
				case 8:
					nextValue = 9;
					break;
				default:
					nextValue = 0;
			}
		} while (!currentPossibleValues.includes(nextValue));
		currentValues[rowIndex][colIndex] = nextValue;
		setValues({
			...values,
			values: currentValues,
		});
	};

	const autoSolveing = () => {
		clearTimeout(timeout);
		if (autoSolve) {
			timeout = setTimeout(() => {
				nextWhereOnlyOnePossibleValue();
			}, 100);
		}
	};

	const nextWhereOnlyOnePossibleValue = () => {
		const onlyOnce: {
			col: number;
			row: number;
			value: SolutionValue;
		}[] = [];
		for (let i = 0; i < 9; i++) {
			const rowValues = possibleValues[i];
			for (let j = 0; j < 9; j++) {
				const colValues = rowValues[j];
				if (colValues.length === 1 && values.values[i][j] === 0) {
					onlyOnce.push({
						col: j,
						row: i,
						value: colValues[0],
					});
				} else if (colValues.length === 0 && initialized) {
					if (values.tryValue !== null) {
						const nextBlockList = createClone(values.blockList);
						nextBlockList[values.tryValue.rowIndex] = nextBlockList[values.tryValue.rowIndex] ?? [];
						nextBlockList[values.tryValue.rowIndex][values.tryValue.colIndex] = nextBlockList[values.tryValue.rowIndex][values.tryValue.colIndex] ?? [];
						if (i === values.tryValue.rowIndex && j === values.tryValue.colIndex) {
							if (values.tryValue.parent !== null) {
								const nextBlockList = createClone(values.tryValue.parent.blockList);
								nextBlockList[values.tryValue.parent.rowIndex] = nextBlockList[values.tryValue.parent.rowIndex] ?? [];
								nextBlockList[values.tryValue.parent.rowIndex][values.tryValue.parent.colIndex] =
									nextBlockList[values.tryValue.parent.rowIndex][values.tryValue.parent.colIndex] ?? [];
								nextBlockList[values.tryValue.parent.rowIndex][values.tryValue.parent.colIndex].push(values.tryValue.parent.value);
								values.tryValue.parent.blockList = nextBlockList;
								setValues({
									blockList: values.tryValue.parent.blockList,
									tryValue: values.tryValue.parent,
									values: values.tryValue.values,
								});
							} else {
								throw new Error('No solution found');
							}
						} else {
							if (nextBlockList[values.tryValue.rowIndex][values.tryValue.colIndex].includes(values.tryValue.value)) {
								reset();
							} else {
								nextBlockList[values.tryValue.rowIndex][values.tryValue.colIndex].push(values.tryValue.value);
								setValues({
									blockList: nextBlockList,
									tryValue: values.tryValue.parent ?? initialValues.tryValue,
									values: values.tryValue.values ?? initialValues.values,
								});
							}
						}
					} else {
						console.log('Endless loop detected');
						reset();
					}
					// console.log('BlockList', values, countValuesInArray(values.blockList));
					return;
				}
			}
		}

		if (onlyOnce.length > 0) {
			const randomIndex = Math.floor(Math.random() * onlyOnce.length);
			const newValues = createClone(values.values);
			newValues[onlyOnce[randomIndex].row][onlyOnce[randomIndex].col] = onlyOnce[randomIndex].value;
			setValues({
				...values,
				values: newValues,
			});
			return;
		}

		const onlyMany: {
			col: number;
			row: number;
			possibleValues: SolutionValue[];
		}[] = [];
		for (let i = 0; i < 9; i++) {
			const rowValues = possibleValues[i];
			for (let j = 0; j < 9; j++) {
				const colValues = rowValues[j];
				if (colValues.length >= 1 && values.values[i][j] === 0) {
					onlyMany.push({
						col: j,
						row: i,
						possibleValues: colValues,
					});
				}
			}
		}

		if (onlyMany.length > 0) {
			const randomCellIndex = Math.floor(Math.random() * onlyMany.length);
			const randomValueIndex = Math.floor(Math.random() * onlyMany[randomCellIndex].possibleValues.length);
			const newValues = createClone(values.values);
			newValues[onlyMany[randomCellIndex].row][onlyMany[randomCellIndex].col] = onlyMany[randomCellIndex].possibleValues[randomValueIndex];
			setValues({
				...values,
				tryValue: {
					blockList: createClone(values.blockList),
					rowIndex: onlyMany[randomCellIndex].row,
					colIndex: onlyMany[randomCellIndex].col,
					value: newValues[onlyMany[randomCellIndex].row][onlyMany[randomCellIndex].col],
					values: createClone(values.values),
					parent: values.tryValue,
				},
				values: newValues,
			});
			return;
		}

		setAutoSolve(false);
	};

	const reset = () => {
		setValues({
			blockList: initialValues.blockList,
			tryValue: initialValues.tryValue,
			values: initialValues.values,
		});
		console.clear();
		console.log(solveSudoku(createClone(initialValues.values)));
	};

	const possibleValues = useMemo(() => {
		return calculatePossibleValues(values.values, values.blockList);
	}, [values]);

	const initialized = useMemo(() => true, [possibleValues]);

	useEffect(() => {
		autoSolveing();
	}, [autoSolve, values]);

	return (
		<div className="container mx-auto p-4 text-center">
			<div className="inline-block">
				<div className="p-1 rounded shadow-dark shadow border-gray">
					{values.values.map((_item, rowIndex) => (
						<div className="flex flex-row" key={`${rowIndex}`}>
							{values.values[rowIndex].map((_item, colIndex) => {
								return (
									<KolButton
										className={`p-.5 border-zinc ${rowIndex > 0 && rowIndex % 3 === 0 ? ' border-t border-t-solid p-t-1' : ''}${
											(rowIndex + 1) % 3 === 0 ? ' p-b-1' : ''
										}${colIndex > 0 && colIndex % 3 === 0 ? ' border-l  border-l-solid p-l-1' : ''}${(colIndex + 1) % 3 === 0 ? ' p-r-1' : ''}`}
										key={`${rowIndex}-${colIndex}`}
										title={possibleValues[rowIndex][colIndex].join(', ')}
										data-value={values.values[rowIndex][colIndex]}
										data-initial-value={initialValues.values[rowIndex][colIndex]}
										_label={`${
											possibleValues[rowIndex][colIndex].length === 1
												? possibleValues[rowIndex][colIndex][0]
												: values.values[rowIndex][colIndex] === 0
												? ''
												: values.values[rowIndex][colIndex]
										}`}
										_on={{
											onClick: () => handleButtonClick(rowIndex, colIndex),
										}}
										_variant={
											values.values[rowIndex][colIndex] === 0
												? possibleValues[rowIndex][colIndex].length === 1
													? 'danger'
													: 'secondary'
												: values.values[rowIndex][colIndex] === initialValues.values[rowIndex][colIndex]
												? 'primary'
												: 'secondary'
										}
									/>
								);
							})}
						</div>
					))}
				</div>
				<div className="flex gap-4 mt-4 place-center">
					<KolButton
						_label={autoSolve ? 'Stop' : 'Slove'}
						_on={{
							onClick: () => {
								setAutoSolve(!autoSolve);
							},
						}}
						_variant="primary"
					/>
					<KolButton
						_label="Save"
						_on={{
							onClick: () => {
								localStorage.setItem('values', JSON.stringify(values));
								setInitialValues(createClone(values));
							},
						}}
						_variant="secondary"
					/>
					<KolButton
						_label="Reset"
						_on={{
							onClick: reset,
						}}
						_variant="ghost"
					/>
					<KolButton
						_label="New"
						_on={{
							onClick: () => {
								createSudoku()
									.then((sudoku) => {
										setValues({
											values: sudoku,
											blockList: [],
											tryValue: null,
										});
										setInitialValues({
											values: createClone(sudoku),
											blockList: [],
											tryValue: null,
										});
									})
									.catch(console.warn);
							},
						}}
						_variant="ghost"
					/>
					<KolButton
						_label="Clear"
						_on={{
							onClick: () => {
								setValues({
									values: [
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
										[0, 0, 0, 0, 0, 0, 0, 0, 0],
									],
									blockList: [],
									tryValue: null,
								});
							},
						}}
						_variant="ghost"
					/>
				</div>
			</div>
		</div>
	);
}

export default App;
