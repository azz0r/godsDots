// Jest test setup
// Suppress console noise during tests
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.warn = (...args) => {
    if (args[0]?.includes?.('[VillagerSystem]') || args[0]?.includes?.('[MainScene]')) return;
    originalWarn(...args);
  };
  console.log = (...args) => {
    if (args[0]?.includes?.('[VillagerSystem]') || args[0]?.includes?.('[MainScene]')) return;
    originalLog(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.log = originalLog;
});
