import request from 'supertest';

import app from '../../../app';

describe('/lifecycleEvents', () => {
	it('/installed should respond 500 when JWT token is missing', () => {
		return request(app).post('/lifecycleEvents/installed').expect(401);
	});
});
