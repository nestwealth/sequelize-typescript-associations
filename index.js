'use strict';

const ArgumentParser = require('argparse').ArgumentParser;

const initArgParser = (ArgParserClass) => {
  const parser = new ArgParserClass({
    version: '0.0.1',
    addHelp: true,
    description: 'generate mixins given association name'
  });
  
  parser.addArgument(
    [ '-b', '--baseModelName' ],
    { help: 'name of base model' },
  )
  
  parser.addArgument(
    [ '-a', '--associationModelName' ],
    { help: 'array of name of model of associations', nargs: '+' },
  );

  parser.addArgument(
    [ '-s', '--singular' ],
    { help: 'array of singular of alias names (the alias for association, may be same as associationModelName)', nargs: '+' }
  );
  
  parser.addArgument(
    [ '-p', '--plural' ],
    { help: 'array of plural of alias names (if n/a then use _)', nargs: '+' },
  );
  
  parser.addArgument(
    [ '-t', '--type' ],
    { help: 'array of either BelongsTo or HasMany or HasOne or BelongsToMany', nargs: '+' }
  );

  parser.addArgument(
    [ '-j', '--joinTable' ],
    { help: 'array of join table names, either JoinTableName or an join table attributes e.g. JoinTableAttributes', nargs: '+' }
  )

  return parser;
}

// FIXME: this doesn't seem to work
// const assertArgLengthsAreTheSame = (args) => {
//   ['associationModelName', 'plural', 'type', 'joinTable'].map(k => console.log(args[k].length));
//   console.log(args.associationModelName.length === args.plural.length === args.type.length === args.joinTable.length);
//   return args.associationModelName.length === args.plural.length === args.type.length === args.joinTable.length;
// };

const addMixinsBelongsTo = (associationModelName, singular) => {
  const AssocInstance = `${associationModelName}Instance`;
  const AssocAttributes = `${associationModelName}Attributes`;
  return (
    `
    get${singular}: sequelize.BelongsToGetAssociationMixin<I${AssocInstance}>;
    set${singular}: sequelize.BelongsToSetAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    create${singular}: sequelize.BelongsToCreateAssociationMixin<I${AssocAttributes}>;
    `
  );
};

const addMixinsHasOne = (associationModelName, singular) => {
  const AssocInstance = `${associationModelName}Instance`;
  const AssocAttributes = `${associationModelName}Attributes`;
  return (
    `
    get${singular}: sequelize.HasOneGetAssociationMixin<I${AssocInstance}>;
    set${singular}: sequelize.HasOneSetAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    create${singular}: sequelize.HasOneCreateAssociationMixin<I${AssocAttributes}>;
    `
  );
};

const addMixinsHasMany = (associationModelName, singular, plural) => {
  const AssocInstance = `${associationModelName}Instance`;
  const AssocAttributes = `${associationModelName}Attributes`;
  return (
    `
    get${plural}: sequelize.HasManyGetAssociationsMixin<I${AssocInstance}>;
    set${plural}: sequelize.HasManySetAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    add${plural}: sequelize.HasManyAddAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    add${singular}: sequelize.HasManyAddAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    create${singular}: sequelize.HasManyCreateAssociationMixin<I${AssocAttributes}, I${AssocInstance}>;
    remove${singular}: sequelize.HasManyRemoveAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    remove${plural}: sequelize.HasManyRemoveAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    has${singular}: sequelize.HasManyHasAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    has${plural}: sequelize.HasManyHasAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    count${plural}: sequelize.HasManyCountAssociationsMixin;
    `
  );
};

const addMixinsBelongsToMany = (associationModelName, singular, plural, joinTableName) => {
  const AssocInstance = `${associationModelName}Instance`;
  const AssocAttributes = `${associationModelName}Attributes`;
  const JoinTableAttributes = joinTableName[0] === '\'' || joinTableName[0] === '\''
    ? joinTableName
    : `${joinTableName}Attributes`;

  return (
    `
    get${plural}: sequelize.BelongsToManyGetAssociationsMixin<I${AssocInstance}>;
    set${plural}: sequelize.BelongsToManySetAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id'], I${JoinTableAttributes}>;
    add${plural}: sequelize.BelongsToManyAddAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id'], I${JoinTableAttributes}>;
    add${singular}: sequelize.BelongsToManyAddAssociationMixin<I${AssocInstance}, I${AssocInstance}['id'], I${JoinTableAttributes}>;
    create${singular}: sequelize.BelongsToManyCreateAssociationMixin<I${AssocAttributes}, I${AssocInstance}['id'], I${JoinTableAttributes}>;
    remove${singular}: sequelize.BelongsToManyRemoveAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    remove${plural}: sequelize.BelongsToManyRemoveAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    has${singular}: sequelize.BelongsToManyHasAssociationMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    has${plural}: sequelize.BelongsToManyHasAssociationsMixin<I${AssocInstance}, I${AssocInstance}['id']>;
    count${plural}: sequelize.BelongsToManyCountAssociationsMixin;
    `
  );
};

const generateInterface = ({ baseModelName, associationModelName, singular, plural, type, joinTable }) => {
  let mixinsString = '';
  for (let i = 0; i < associationModelName.length; i++) {
    if (type[i] === 'BelongsTo') {
      mixinsString += addMixinsBelongsTo(associationModelName[i], singular[i]);
    } else if (type[i] === 'HasOne') {
      mixinsString += addMixinsHasOne(associationModelName[i], singular[i]);
    } else if (type[i] === 'HasMany') {
      mixinsString += addMixinsHasMany(associationModelName[i], singular[i], plural[i]);
    } else if (type[i] === 'BelongsToMany') {
      mixinsString += addMixinsBelongsToMany(associationModelName[i], singular[i], plural[i], joinTable[i]);
    } else {
      console.error('incorrect type: ', type[i]);
      return;
    }
  }

  let interfaceString =
    `export interface I${baseModelName}Instance extends sequelize.Instance<I${baseModelName}Attributes>, I${baseModelName}Attributes {
      ${mixinsString}
  };
    `;

  return interfaceString;
};

const main = () => {
  const parser = initArgParser(ArgumentParser);
  const args = parser.parseArgs();
  const interfaceString = generateInterface(args);
  console.log(interfaceString);
}

main();
