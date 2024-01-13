'use strict';

import * as vscode from 'vscode';

function formatFirstLiteral(document: vscode.TextDocument, begin: number, end: number): vscode.TextEdit[] {
    const eqPattern = /^(\s*)([a-zA-Z_\-0-9]+)(\s*)=/;
    let longestLiteralLen = 0

    for (let i = begin; i < end; i++) {
        const match = document.lineAt(i).text.match(eqPattern);
        if (match) {
            longestLiteralLen = Math.max(longestLiteralLen, match[2].length)
        }
    }

    console.log("LONGEST", longestLiteralLen)
    let changes: vscode.TextEdit[] = [];

    for (let i = begin; i < end; i++) {
        var line = document.lineAt(i).text;
        var match = line.match(eqPattern);

        if (match) {
            var name = match[2];
            var newSpaces = ' '.repeat(longestLiteralLen + 1 - name.length);
            var newText = line.replace(eqPattern, name+newSpaces+'=');
            const edit = vscode.TextEdit.replace(document.lineAt(i).range, newText);
            changes.push(edit);
        }
    }

    return changes;
}

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerDocumentFormattingEditProvider('leg', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            var begin = 0
            var end = document.lineCount
            for (let i = 0; i < document.lineCount; i++) {
                if (document.lineAt(i).text.includes("%}")) {
                    begin = i+1
                }
                if (document.lineAt(i).text.includes("%%")) {
                    end = i
                } 
            }

            var changes = formatFirstLiteral(document, begin, end);
            return changes
        }
    });
}


