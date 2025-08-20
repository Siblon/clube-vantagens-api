jest.mock('../config/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../config/supabase');
const service = require('../src/features/planos/planos.service');

describe('Planos Service', () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  test('getAllPlanos retorna lista', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    });

    const { data } = await service.getAllPlanos();
    expect(supabase.from).toHaveBeenCalledWith('planos');
    expect(data).toEqual([{ id: 1 }]);
  });

  test('createPlano cria plano', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    supabase.from.mockReturnValue({ insert });

    const payload = { nome: 'A', descricao: 'desc', preco: 10 };
    const { data } = await service.createPlano(payload);
    expect(insert).toHaveBeenCalledWith([payload]);
    expect(data).toEqual({ id: 1 });
  });

  test('updatePlano atualiza plano', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 1, nome: 'B' }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const eq = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ update });

    const { data } = await service.updatePlano(1, { nome: 'B' });
    expect(update).toHaveBeenCalledWith({ nome: 'B' });
    expect(eq).toHaveBeenCalledWith('id', 1);
    expect(data).toEqual({ id: 1, nome: 'B' });
  });

  test('deletePlano remove plano', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: null });
    const del = jest.fn().mockReturnValue({ eq });
    supabase.from.mockReturnValue({ delete: del });

    const { data } = await service.deletePlano(1);
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 1);
    expect(data).toBeNull();
  });
});
