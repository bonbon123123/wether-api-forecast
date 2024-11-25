import request from 'supertest';
import { createServer } from 'http';
import { GET as handler1 } from '../api/endpoint1/route';
import { GET as handler2 } from '../api/endpoint2/route';

const createTestServer = (handler) => {
    return createServer(async (req, res) => {
        try {
            const response = await handler(new Request(new URL(req.url, 'http://localhost')));

            const status = response.status;
            const data = await response.json();

            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Błąd wewnętrzny serwera' }));
        }
    });
};

describe('Endpunkty API prognozy pogody', () => {
    let server1, server2;

    beforeAll(() => {
        server1 = createTestServer(handler1);
        server2 = createTestServer(handler2);
    });

    afterAll(async () => {
        await new Promise((resolve) => {
            server1.close(() => {
                server2.close(resolve);
            });
        });
    });


    describe('GET /api/endpoint1', () => {

        it('powinno zwrócić 400 dla niepoprawnych współrzędnych', async () => {
            const testCases = [
                { latitude: '1000', longitude: '50' },    // latitude > 90
                { latitude: '-100', longitude: '50' },    // latitude < -90
                { latitude: '50', longitude: '200' },     // longitude > 180
                { latitude: '50', longitude: '-200' },    // longitude < -180
                { latitude: 'abc', longitude: '50' },     // string szerokość geograficzna
                { latitude: '50', longitude: 'xyz' },     // string długość geograficzna
                { latitude: 'invalid', longitude: 'invalid' } // 2 string
            ];

            for (const testCase of testCases) {
                const response = await request(server2)
                    .get(`/?latitude=${testCase.latitude}&longitude=${testCase.longitude}`);

                expect(response.status).toBe(400);
                expect(response.body).toHaveProperty('error');
            }
        });

        it('powinno zwrócić dane prognozy pogody z poprawną strukturą', async () => {
            const response = await request(server1)
                .get('/?latitude=50&longitude=19');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBeTruthy();

            // Sprawdzanie struktury pierwszego dnia
            const firstDay = response.body.data[0];
            expect(firstDay).toHaveProperty('date');
            expect(firstDay).toHaveProperty('code');
            expect(firstDay).toHaveProperty('minTemp');
            expect(firstDay).toHaveProperty('maxTemp');
            expect(firstDay).toHaveProperty('generatedEnergy');
        });

        it('powinno zwrócić prognozę na 7 dni', async () => {
            const response = await request(server1)
                .get('/?latitude=50&longitude=19');
            expect(response.body.data.length).toBe(7);
        });

        it('powinno poprawnie obliczyć wygenerowaną energię', async () => {
            const response = await request(server1)
                .get('/?latitude=50&longitude=19');

            const firstDay = response.body.data[0];
            expect(firstDay.generatedEnergy).toBeGreaterThanOrEqual(0);
            expect(typeof firstDay.generatedEnergy).toBe('number');
        });
    });

    describe('GET /api/endpoint2', () => {
        it('powinno zwrócić 400 dla niepoprawnych współrzędnych', async () => {
            const testCases = [
                { latitude: '1000', longitude: '50' },    // latitude > 90
                { latitude: '-100', longitude: '50' },    // latitude < -90
                { latitude: '50', longitude: '200' },     // longitude > 180
                { latitude: '50', longitude: '-200' },    // longitude < -180
                { latitude: 'abc', longitude: '50' },     // string szerokość geograficzna
                { latitude: '50', longitude: 'xyz' },     // string długość geograficzna
                { latitude: 'invalid', longitude: 'invalid' } // 2 string
            ];

            for (const testCase of testCases) {
                const response = await request(server1)
                    .get(`/?latitude=${testCase.latitude}&longitude=${testCase.longitude}`);

                expect(response.status).toBe(400);
                expect(response.body).toHaveProperty('error');
            }
        });

        it('powinno zwrócić podsumowanie pogody z poprawną strukturą', async () => {
            const response = await request(server2)
                .get('/?latitude=50&longitude=19');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');

            const data = response.body.data;
            expect(data).toHaveProperty('dateRange');
            expect(data).toHaveProperty('averagePressure');
            expect(data).toHaveProperty('averageSunshineDuration');
            expect(data).toHaveProperty('extremeTemperatures');
            expect(data).toHaveProperty('weatherSummary');
        });

        it('powinno zwrócić poprawne ekstremalne temperatury', async () => {
            const response = await request(server2)
                .get('/?latitude=50&longitude=19');

            const { extremeTemperatures } = response.body.data;
            expect(extremeTemperatures).toHaveProperty('minTemp');
            expect(extremeTemperatures).toHaveProperty('maxTemp');
            expect(extremeTemperatures.maxTemp).toBeGreaterThanOrEqual(extremeTemperatures.minTemp);
        });

        it('powinno zwrócić poprawny status podsumowania pogody', async () => {
            const response = await request(server2)
                .get('/?latitude=50&longitude=19');

            const validSummaries = ['bez opadów', 'z opadami śniegu', 'z opadami deszczu'];
            expect(validSummaries).toContain(response.body.data.weatherSummary);
        });
    });

    describe('Obsługa błędów', () => {
        it('powinno obsługiwać błędy API poprawnie', async () => {

            const response = await request(server1)
                .get('/?latitude=90&longitude=180'); // Używamy skrajnych współrzędnych

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
        });
    });
});
