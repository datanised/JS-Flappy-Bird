const crateDBConfig = {
  host: 'localhost',
  port: 4200,
  username: 'crate',
  password: ''
};

class CrateDBHandler {
  constructor() {
    this.baseUrl = '/api'; // Update to use backend proxy
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
    //   console.log('Attempting to save score:', { playerName, score });
      
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerName: playerName,
          score: parseInt(score)
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save score');
      }
      
      console.log('Score saved successfully:', data);
      return {
        success: true,
        id: data.id
      };
      
    } catch (error) {
      console.error('Save score failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const crateDB = new CrateDBHandler();
