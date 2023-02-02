import { Router } from 'express';

export const WebhooksRouter = Router();

WebhooksRouter.post('/jira/issue-created', (req, res) => {
    // TODO: add this log into DB
    console.log('Jira Issue Created', req.body);
    res.sendStatus(200);
});

WebhooksRouter.post('/jira/issue-updated', (req, res) => {
    // TODO: add this log into DB
    console.log('Jira Issue Updated', req.body);
    res.sendStatus(200);
});

WebhooksRouter.post('/jira/issue-deleted', (req, res) => {
    // TODO: add this log into DB
    console.log('Jira Issue Deleted', req.body);
    res.sendStatus(200);
});
