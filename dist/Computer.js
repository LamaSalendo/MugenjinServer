"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Computer {
    constructor(id) {
        this.id = id;
        this.instruction = new Map();
    }
    addInstruction(ID) {
        this.instruction.set(ID, undefined);
    }
}
exports.default = Computer;
