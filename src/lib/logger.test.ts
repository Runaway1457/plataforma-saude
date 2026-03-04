/**
 * Testes para o Logger estruturado
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger.info', () => {
    it('deve logar evento info em formato JSON', () => {
      logger.info('test_event', { key: 'value' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(logged.level).toBe('info');
      expect(logged.event).toBe('test_event');
      expect(logged.key).toBe('value');
      expect(logged.timestamp).toBeDefined();
    });

    it('deve funcionar sem dados adicionais', () => {
      logger.info('simple_event');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(logged.event).toBe('simple_event');
    });
  });

  describe('logger.warn', () => {
    it('deve logar evento warn em formato JSON', () => {
      logger.warn('warning_event', { reason: 'test' });

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
      expect(logged.level).toBe('warn');
      expect(logged.event).toBe('warning_event');
    });
  });

  describe('logger.error', () => {
    it('deve logar evento error em formato JSON', () => {
      logger.error('error_event', { message: 'Something failed' });

      expect(consoleSpy.error).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(logged.level).toBe('error');
      expect(logged.event).toBe('error_event');
    });
  });

  describe('logger.debug', () => {
    it('deve logar evento debug em formato JSON', () => {
      logger.debug('debug_event', { detail: 'debug info' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logged = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(logged.level).toBe('debug');
      expect(logged.event).toBe('debug_event');
    });
  });

  describe('Estrutura do log', () => {
    it('deve incluir timestamp ISO válido', () => {
      logger.info('timestamp_test');

      const logged = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      const timestamp = new Date(logged.timestamp);
      expect(timestamp.toISOString()).toBe(logged.timestamp);
    });

    it('deve preservar tipos de dados', () => {
      logger.info('type_test', {
        string: 'text',
        number: 42,
        boolean: true,
        nested: { key: 'value' },
        array: [1, 2, 3],
      });

      const logged = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(logged.string).toBe('text');
      expect(logged.number).toBe(42);
      expect(logged.boolean).toBe(true);
      expect(logged.nested).toEqual({ key: 'value' });
      expect(logged.array).toEqual([1, 2, 3]);
    });
  });
});
