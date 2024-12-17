import { Element } from '@xmpp/xml';
import { MAMQueryBuilder } from '../../../features/mam/queries';
import { MAMNamespaces } from '../../../constants/namespaces';
import { FormField, MAMQueryOptions, RSMOptions } from '../../../types/mam';

// Mock uuid to have consistent IDs in tests
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid',
}));

describe('MAMQueryBuilder', () => {
    let queryBuilder: MAMQueryBuilder;

    beforeEach(() => {
        queryBuilder = new MAMQueryBuilder();
    });

    describe('createElement', () => {
        it('should create element with name only', () => {
            const element = queryBuilder['createElement']('test');
            expect(element.name).toBe('test');
            expect(element.attrs).toEqual({});
        });

        it('should create element with attributes', () => {
            const attrs = { id: '123', type: 'test' };
            const element = queryBuilder['createElement']('test', attrs);
            expect(element.name).toBe('test');
            expect(element.attrs).toEqual(attrs);
        });
    });

    describe('createTextElement', () => {
        it('should create element with text content', () => {
            const element = queryBuilder['createTextElement'](
                'test',
                'content',
            );
            expect(element.name).toBe('test');
            expect(element.children[0]).toBe('content');
        });
    });

    describe('createFormField', () => {
        it('should create basic field element', () => {
            const field: FormField = {
                name: 'test',
                value: 'value',
            };
            const element = queryBuilder['createFormField'](field);
            expect(element.name).toBe('field');
            expect(element.attrs.var).toBe('test');
            expect(element.getChild('value')?.children[0]).toBe('value');
        });

        it('should include type attribute if specified', () => {
            const field: FormField = {
                name: 'test',
                value: 'value',
                type: 'text-single',
            };
            const element = queryBuilder['createFormField'](field);
            expect(element.attrs.type).toBe('text-single');
        });
    });

    describe('createDataForm', () => {
        it('should create form with FORM_TYPE and fields', () => {
            const fields: FormField[] = [
                { name: 'test1', value: 'value1' },
                { name: 'test2', value: 'value2' },
            ];
            const form = queryBuilder['createDataForm'](fields);

            expect(form.attrs.xmlns).toBe(MAMNamespaces.DATAFORM);
            expect(form.attrs.type).toBe('submit');

            const formFields = form.getChildren('field');
            expect(formFields).toHaveLength(3); // FORM_TYPE + 2 custom fields

            const formType = formFields.find(
                (f) => f.attrs.var === 'FORM_TYPE',
            );
            expect(formType?.attrs.type).toBe('hidden');
            expect(formType?.getChild('value')?.children[0]).toBe(
                MAMNamespaces.MAM,
            );
        });
    });

    describe('createRSM', () => {
        it('should create RSM element with max', () => {
            const options: RSMOptions = { max: 10 };
            const rsm = queryBuilder['createRSM'](options);
            expect(rsm.attrs.xmlns).toBe(MAMNamespaces.RSM);
            expect(rsm.getChildText('max')).toBe('10');
        });

        it('should create RSM element with before', () => {
            const options: RSMOptions = { before: 'id-123' };
            const rsm = queryBuilder['createRSM'](options);
            expect(rsm.getChildText('before')).toBe('id-123');
        });

        it('should create empty before element', () => {
            const options: RSMOptions = { before: '' };
            const rsm = queryBuilder['createRSM'](options);
            expect(rsm.getChild('before')).toBeTruthy();
            expect(rsm.getChildText('before')).toBe('');
        });

        it('should create RSM element with after', () => {
            const options: RSMOptions = { after: 'id-123' };
            const rsm = queryBuilder['createRSM'](options);
            expect(rsm.getChildText('after')).toBe('id-123');
        });

        it('should create RSM element with index', () => {
            const options: RSMOptions = { index: 5 };
            const rsm = queryBuilder['createRSM'](options);
            expect(rsm.getChildText('index')).toBe('5');
        });
    });

    describe('createFilterFields', () => {
        it('should create fields from filters', () => {
            const startDate = new Date('2023-01-01T00:00:00Z');
            const endDate = new Date('2023-01-02T00:00:00Z');
            const filters = {
                with: 'user@domain',
                start: startDate,
                end: endDate,
            };

            const fields = queryBuilder['createFilterFields'](filters);
            expect(fields).toHaveLength(3);
            expect(fields).toContainEqual({
                name: 'with',
                value: 'user@domain',
            });
            expect(fields).toContainEqual({
                name: 'start',
                value: startDate.toISOString(),
            });
            expect(fields).toContainEqual({
                name: 'end',
                value: endDate.toISOString(),
            });
        });
    });

    describe('createQuery', () => {
        it('should create basic query', () => {
            const query = queryBuilder.createQuery();
            expect(query.is('iq')).toBe(true);
            expect(query.attrs.type).toBe('set');
            expect(query.attrs.id).toBe('mock-uuid');

            const queryElement = query.getChild('query');
            expect(queryElement?.attrs.xmlns).toBe(MAMNamespaces.MAM);
            expect(queryElement?.attrs.queryid).toBe('mock-uuid');
        });

        it('should create query with custom namespace and node', () => {
            const options: MAMQueryOptions = {
                namespace: 'custom:namespace',
                node: 'custom-node',
            };
            const query = queryBuilder.createQuery(options);
            const queryElement = query.getChild('query');
            expect(queryElement?.attrs.xmlns).toBe('custom:namespace');
            expect(queryElement?.attrs.node).toBe('custom-node');
        });

        it('should create query with filters and RSM', () => {
            const options: MAMQueryOptions = {
                filters: {
                    with: 'user@domain',
                    start: new Date('2024-12-17T00:00:00Z'),
                },
                rsm: {
                    max: 10,
                    after: 'id-123',
                },
            };

            const query = queryBuilder.createQuery(options);
            const queryElement = query.getChild('query');

            // Check data form
            const x = queryElement?.getChild('x');
            expect(x?.attrs.xmlns).toBe(MAMNamespaces.DATAFORM);

            // Check RSM
            const set = queryElement?.getChild('set');
            expect(set?.attrs.xmlns).toBe(MAMNamespaces.RSM);
            expect(set?.getChildText('max')).toBe('10');
            expect(set?.getChildText('after')).toBe('id-123');
        });
    });
});
