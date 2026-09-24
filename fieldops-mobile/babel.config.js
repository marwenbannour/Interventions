module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Décorateurs legacy (stage 2) requis par les modèles WatermelonDB (@field, @date, @children...).
    plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
  };
};
