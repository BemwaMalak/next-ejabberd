import { Element } from '@xmpp/xml';
import { v4 as uuidv4 } from 'uuid';
import {
    FormField,
    RSMOptions,
    MAMFilterOptions,
    MAMQueryOptions,
} from '../../types/mam';
import { FileNamespaces, MAMNamespaces } from '../../constants/namespaces';

export class MAMQueryBuilder {
    /**
     * Creates a basic Element with attributes
     */
    private createElement(
        name: string,
        attrs: Record<string, string> = {},
    ): Element {
        return new Element(name, attrs);
    }

    /**
     * Creates a text Element
     */
    private createTextElement(name: string, text: string): Element {
        const element = this.createElement(name);
        element.children.push(text);
        return element;
    }

    /**
     * Creates a data form field
     */
    private createFormField(field: FormField): Element {
        const fieldElement = this.createElement('field', {
            var: field.name,
            ...(field.type ? { type: field.type } : {}),
        });

        const valueElement = this.createElement('value');
        valueElement.children.push(field.value.toString());
        fieldElement.children.push(valueElement);

        return fieldElement;
    }

    /**
     * Creates a data form with fields
     */
    private createDataForm(fields: FormField[]): Element {
        const x = this.createElement('x', {
            xmlns: MAMNamespaces.DATAFORM,
            type: 'submit',
        });

        // Add FORM_TYPE field
        const formTypeField = this.createFormField({
            name: 'FORM_TYPE',
            value: MAMNamespaces.MAM,
            type: 'hidden',
        });
        x.children.push(formTypeField);

        // Add all other fields
        fields.forEach((field) => {
            x.children.push(this.createFormField(field));
        });

        return x;
    }

    /**
     * Creates RSM (Result Set Management) element
     */
    private createRSM(options: RSMOptions): Element {
        const set = this.createElement('set', { xmlns: MAMNamespaces.RSM });

        if (options.max !== undefined) {
            set.children.push(
                this.createTextElement('max', options.max.toString()),
            );
        }

        if (options.before !== undefined) {
            if (options.before === '') {
                set.children.push(this.createElement('before'));
            } else {
                set.children.push(
                    this.createTextElement('before', options.before),
                );
            }
        }

        if (options.after !== undefined) {
            set.children.push(this.createTextElement('after', options.after));
        }

        if (options.index !== undefined) {
            set.children.push(
                this.createTextElement('index', options.index.toString()),
            );
        }

        return set;
    }

    /**
     * Creates filter fields from MAMFilterOptions
     */
    private createFilterFields(filters: MAMFilterOptions): FormField[] {
        const fields: FormField[] = [];

        if (filters.with) {
            fields.push({ name: 'with', value: filters.with });
        }

        if (filters.start) {
            fields.push({ name: 'start', value: filters.start.toISOString() });
        }

        if (filters.end) {
            fields.push({ name: 'end', value: filters.end.toISOString() });
        }

        return fields;
    }

    /**
     * Creates a complete MAM query
     */
    public createQuery(options: MAMQueryOptions = {}): Element {
        const queryId = options.queryId || uuidv4();

        // Create IQ stanza
        const iq = this.createElement('iq', {
            type: 'set',
            id: queryId,
        });

        // Create query element
        const query = this.createElement('query', {
            xmlns: options.namespace || MAMNamespaces.MAM,
            queryid: queryId,
            ...(options.node ? { node: options.node } : {}),
        });

        // Add data form if there are filters
        if (options.filters && Object.keys(options.filters).length > 0) {
            const fields = this.createFilterFields(options.filters);
            const x = this.createDataForm(fields);
            query.children.push(x);
        }

        // Add RSM if specified
        if (options.rsm) {
            const set = this.createRSM(options.rsm);
            query.children.push(set);
        }

        iq.children.push(query);
        return iq;
    }
}
