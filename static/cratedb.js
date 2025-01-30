const crateDBConfig = {
  host: 'localhost',
  port: 4200,
  username: 'crate',
  password: ''
};

class CrateDBHandler {
  constructor() {
    this.baseUrl = `http://${crateDBConfig.host}:${crateDBConfig.port}/_sql`;
  }

  async getLeaderboard(limit = 10) {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      return data.scores;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async saveScore(playerName, score) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          score 
        })
      });
    } catch (error) {
      console.error('Error saving score:', error);
    }
  }
}

export const crateDB = new CrateDBHandler();