// Metro não conhece `.glb` de fábrica: sem registrar aqui, o `require` do
// modelo anatômico resolve como módulo JavaScript e o bundle quebra.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');

module.exports = config;
