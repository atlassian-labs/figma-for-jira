import Datastore from 'nedb';
import path from 'path';

export const DBFile = new Datastore({
    filename: path.join(__dirname, './storage/storageFile.db') ,
    autoload: true
});

export type TenantType = {
    key: string;
    description: string;
    host: string;
};