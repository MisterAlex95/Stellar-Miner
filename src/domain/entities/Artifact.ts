/** Entity: special item with permanent or temporary bonus. */
export class Artifact {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly effect: unknown,
    public readonly isActive: boolean
  ) {}
}
