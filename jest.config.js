module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/__tests__/helpers/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^bwip-js/generic$': '<rootDir>/node_modules/bwip-js/dist/bwip-js-node.js' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo/.*|react-navigation|@react-navigation/.*|react-native-svg|bwip-js)',
  ],
};
