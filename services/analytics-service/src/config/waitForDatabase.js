const pool = require("./db");

/*
 * Containers and Kubernetes pods start in parallel, so the database is
 * usually still initialising when the service boots. Retry with a fixed
 * backoff instead of giving up on the first connection error.
 */

const waitForDatabase = async (
    retries = 30,
    delayMs = 3000
) => {

    for (
        let attempt = 1;
        attempt <= retries;
        attempt++
    ) {

        try {

            await pool.query("SELECT 1");

            return;

        } catch (error) {

            console.error(
                `Database not ready (attempt ${attempt}/${retries}): ${error.message}`
            );

            if (attempt === retries) {
                throw error;
            }

            await new Promise(
                resolve =>
                    setTimeout(resolve, delayMs)
            );
        }
    }
};


module.exports = {
    waitForDatabase
};
