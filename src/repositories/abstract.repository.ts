export interface Repository<
  TEntity,
  TCreateInput,
  TUpdateInput = Partial<TCreateInput>,
> {
  create(data: TCreateInput): Promise<TEntity>;
  findById(id: string): Promise<TEntity | null>;
  findAll(): Promise<TEntity[]>;
  update(id: string, data: TUpdateInput): Promise<TEntity>;
}
