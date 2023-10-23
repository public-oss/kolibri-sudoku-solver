import { Value } from './Sudokus';

export function solveSudoku(board: Value[][]) {
	// Find the first empty cell (with a value of 0)
	const emptyCell = findEmptyCell(board);

	// If there are no empty cells, the puzzle is solved
	if (!emptyCell) {
		return true;
	}

	const [row, col] = emptyCell;

	// Try filling the empty cell with a number from 1 to 9
	for (let num = 1; num <= 9; num++) {
		if (isValidMove(board, row, col, num as Value)) {
			// If the move is valid, place the number in the cell
			board[row][col] = num as Value;

			// Recursively attempt to solve the puzzle
			if (solveSudoku(board)) {
				return board;
			}

			// If the recursive attempt fails, backtrack and reset the cell
			board[row][col] = 0;
		}
	}

	// No solution was found, so return false
	return false;
}

function findEmptyCell(board: Value[][]) {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (board[row][col] === 0) {
				return [row, col];
			}
		}
	}
	return null;
}

function isValidMove(board: Value[][], row: number, col: number, num: Value) {
	// Check row
	for (let i = 0; i < 9; i++) {
		if (board[row][i] === num) {
			return false;
		}
	}

	// Check column
	for (let i = 0; i < 9; i++) {
		if (board[i][col] === num) {
			return false;
		}
	}

	// Check 3x3 subgrid
	const subgridRow = Math.floor(row / 3) * 3;
	const subgridCol = Math.floor(col / 3) * 3;
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			if (board[subgridRow + i][subgridCol + j] === num) {
				return false;
			}
		}
	}

	// If no conflicts are found, the move is valid
	return true;
}
