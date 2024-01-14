'use strict';

import * as vscode from 'vscode';

function formatTabs(document: vscode.TextDocument, begin: number, end: number): vscode.TextEdit[] {
    const tbPattern = /\t/;
    let changes: vscode.TextEdit[] = [];

    for (let i = begin; i < end; i++) {
        const line = document.lineAt(i).text;
        const match = line.match(tbPattern);

        if (match) {
            const newText = line.replace(tbPattern, ' ');
            if (newText !== line) {
                const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
                changes.push(edit);
            }
        }
    }

    return changes;
}

function formatFirstLiteral(document: vscode.TextDocument, begin: number, end: number): vscode.TextEdit[] {
    const eqPattern = /^(\s*)([a-zA-Z_\-0-9]+)(\s*)=/;
    let longestLiteralLen = 0

    for (let i = begin; i < end; i++) {
        const match = document.lineAt(i).text.match(eqPattern);
        if (match) {
            longestLiteralLen = Math.max(longestLiteralLen, match[2].length)
        }
    }

    let changes: vscode.TextEdit[] = [];

    for (let i = begin; i < end; i++) {
        const line = document.lineAt(i).text;
        const match = line.match(eqPattern);

        if (match) {
            const name = match[2];
            const newSpaces = ' '.repeat(longestLiteralLen + 1 - name.length);
            const newText = line.replace(eqPattern, name + newSpaces + '=');
            if (newText !== line) {
                const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
                changes.push(edit);
            }
        }
    }

    return changes;
}

function formatOption(document: vscode.TextDocument, begin: number, end: number): vscode.TextEdit[] {
    const eqPattern = /^(\s*[a-zA-Z_\-0-9]+\s*)=/;
    const opPattern = /^(\s*)\|(\s*)/;
    const clPattern = /^(\s*)\)/;

    let changes: vscode.TextEdit[] = [];

    let lastOffset = 0;
    for (let i = begin; i < end; i++) {
        const line = document.lineAt(i).text;
        const matchEq = line.match(eqPattern);
        let stack: number[] = []
        if (matchEq) {
            for (let pos = 0; pos < line.length; pos++) {
                if (line[pos] === '(') {
                    stack.push(pos);
                }
                if (line[pos] === ')') {
                    stack.pop();
                }
            }
            lastOffset = stack.length > 0 ? stack[stack.length - 1] : matchEq[1].length;
        }

        const newSpaces = ' '.repeat(lastOffset);
        let match = line.match(opPattern);
        if (match) {
            const newText = line.replace(opPattern, newSpaces + '| ');
            if (newText !== line) {
                const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
                changes.push(edit);
            }
        }
        match = line.match(clPattern);
        if (match) {
            const newText = line.replace(clPattern, newSpaces + ')');
            if (newText !== line) {
                const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
                changes.push(edit);
            }
        }
    }

    return changes;
}

function formatCode(document: vscode.TextDocument, begin: number, end: number): vscode.TextEdit[] {
    const cdPattern = /^(.+[^\s]+)(\s*)(\{.+\})/;

    let changes: vscode.TextEdit[] = [];

    let longestCodeLen = 0;
    for (let i = begin; i < end; i++) {
        const line = document.lineAt(i).text;
        const matchCd = line.match(cdPattern);
        if (matchCd) {
            longestCodeLen = Math.max(longestCodeLen, matchCd[1].length);
        }
    }

    console.log("longestCodeLen", longestCodeLen)
    for (let i = begin; i < end; i++) {
        const line = document.lineAt(i).text;
        const matchCd = line.match(cdPattern);
        if (matchCd) {
            const before = matchCd[1];
            const code = matchCd[3];
            const newText = line.replace(cdPattern, before + ' '.repeat(longestCodeLen - before.length + 1) + code);
            if (newText !== line) {
                const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
                changes.push(edit);
            }
        }
    }

    return changes;
}

function apply(document: vscode.TextDocument, edits: vscode.TextEdit[]) {
    let workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(document.uri, edits);
    vscode.workspace.applyEdit(workspaceEdit);
}

type Formatter = (document: vscode.TextDocument, begin: number, end: number) => vscode.TextEdit[];
function chain(document: vscode.TextDocument, fmts: Formatter[], begin: number, end: number) {
    let changes: vscode.TextEdit[];
    for (let i = 0; i < fmts.length; i++) {
        changes = fmts[i](document, begin, end);
        if (changes.length !== 0) {
            apply(document, changes);
            break;
        }
    }
}

function format(document: vscode.TextDocument) {
    let begin = 0
    let end = document.lineCount
    for (let i = 0; i < document.lineCount; i++) {
        if (document.lineAt(i).text.includes("%}")) {
            begin = i + 1
        }
        if (document.lineAt(i).text.includes("%%")) {
            end = i
        }
    }

    chain(document, [
        formatTabs,
        formatFirstLiteral,
        formatOption,
        formatCode,
    ], begin, end);
}

export function activate(context: vscode.ExtensionContext) {
    vscode.commands.registerTextEditorCommand("extension.format-leg", () => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const document = editor.document;
            format(document);
        }
    });
    vscode.languages.registerDocumentFormattingEditProvider('leg', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            format(document);
            return [];
        }
    });
}


