declare module 'swagger-jsdoc' {
  namespace swaggerJSDoc {
    interface Options {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      definition: any;
      apis: string[];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function swaggerJSDoc(options: swaggerJSDoc.Options): any;

  export = swaggerJSDoc;
}
