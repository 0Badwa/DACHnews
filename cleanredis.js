import Redis from "ioredis"; // Ili druga Redis biblioteka koju koristite

// Inicijalizujte Redis klijent
const redisClient = new Redis(); // Dodajte ovde konfiguraciju ako koristite custom port ili host

(async () => {
  try {
    console.log("Čišćenje Redis baza...");

    // OBRISATI sve `category:*` liste
    const categoryKeys = await redisClient.keys("category:*");
    for (const key of categoryKeys) {
      await redisClient.del(key);
      console.log(`Obrisan ključ: ${key}`);
    }

    // OBRISATI set `processed_ids`
    await redisClient.del("processed_ids");
    console.log("Obrisan set: processed_ids");

    console.log("Redis baze uspešno očišćene!");
  } catch (error) {
    console.error("Greška prilikom čišćenja Redis baza:", error);
  } finally {
    redisClient.disconnect(); // Zatvorite konekciju
  }
})();
