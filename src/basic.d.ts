declare module Basic {

  interface ICallback<T> {
    (...restARgs): T;
  }

  interface IHashMap<T> {
    [name: string]: T;
  }

  interface IStruct<T> {
    new (...restArgs): T;
  }

  interface IConstructor<T> {
    new (...restArgs): T;
  }

  interface IBuilder<T> {
    build(name: string, scope: {}, method: any, args?: [any]): T;
    destroy(name: string): void;
  }

  type IFormInput = IHashMap<string>;

}
