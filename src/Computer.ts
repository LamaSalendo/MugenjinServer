export default class Computer {
  id: string;
  private instruction: Map<string, any>;

  constructor(id: string) {
    this.id = id;
    this.instruction = new Map<string, any>();
  }

  addInstruction(ID: string) {
    this.instruction.set(ID, undefined);
  }
}
