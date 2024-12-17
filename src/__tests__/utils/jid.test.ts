import { JIDUtils } from '../../utils/jid';

describe('JIDUtils', () => {
    describe('parse', () => {
        it('should correctly parse a full JID', () => {
            const result = JIDUtils.parse('user@domain/resource');
            expect(result).toEqual({
                local: 'user',
                domain: 'domain',
                resource: 'resource',
            });
        });

        it('should correctly parse a bare JID', () => {
            const result = JIDUtils.parse('user@domain');
            expect(result).toEqual({
                local: 'user',
                domain: 'domain',
                resource: '',
            });
        });
    });

    describe('getBare', () => {
        it('should return bare JID from full JID', () => {
            const result = JIDUtils.getBare('user@domain/resource');
            expect(result).toBe('user@domain');
        });

        it('should return same JID if already bare', () => {
            const result = JIDUtils.getBare('user@domain');
            expect(result).toBe('user@domain');
        });
    });
});
