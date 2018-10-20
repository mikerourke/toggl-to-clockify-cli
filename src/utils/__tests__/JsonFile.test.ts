import JsonFile from '../JsonFile';

describe('The JsonFile class', () => {
  describe('the validatePath() method', () => {
    it('does some stuff', () => {
      const result = JsonFile.validatePath('test');
      console.log(result);
      expect(true).toEqual(true);
    });
  });
});
