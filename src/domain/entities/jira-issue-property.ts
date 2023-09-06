export type AttachedDesignUrlProperty<T extends AttachedDesignUrlPropertyKey> =
	{
		key: T;
		value: string;
	};

export type AttachedDesignUrlPropertyKey =
	| 'attached-design-url'
	| 'attached-design-url-v2';

export type AttachedDesignUrlV2 = {
	url: string;
	name: string;
};
