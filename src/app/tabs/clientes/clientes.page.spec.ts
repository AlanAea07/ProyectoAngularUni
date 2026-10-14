import { vi } from 'vitest';
import { Router } from '@angular/router';
import { AlertController, IonItemSliding } from '@ionic/angular';
import { ClientesPage } from './clientes.page';
import { ClientesService } from '../../services/clientes.service';
import { AuthService } from '../../services/auth.service';
import { Cliente } from '../../models/cliente.model';

describe('Operaciones de clientes', () => {
  const cliente = {id: 7, nombre: 'Ana', saldo: 150} as Cliente;
  const operaciones = ['crearCliente', 'actualizarCliente', 'desactivarCliente'] as const;
  for (const operacion of operaciones) {
    it(`${operacion}: bloquea duplicados, muestra carga y permite reintentar tras un error`, async () => {
      let rechazar!: (error: unknown) => void;
      const pendiente = new Promise<never>((_, reject) => { rechazar = reject; });
      const enviar = vi.fn().mockReturnValueOnce(pendiente).mockResolvedValue({success: true});
      const servicio = { [operacion]: enviar, getClientes: vi.fn().mockResolvedValue({success: true, clientes: []}) };
      const page = new ClientesPage(servicio as unknown as ClientesService,
        {esAdmin: () => true} as AuthService, {} as Router, {} as AlertController);
      const ejecutar = () => operacion === 'crearCliente' ? page['crearCliente']('Ana', '123') :
        operacion === 'actualizarCliente' ? page['actualizarCliente'](7, 'Ana') : page['desactivarCliente'](7);
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const primera = ejecutar();
        expect(page.guardando()).toBe(true);
        await ejecutar();
        expect(enviar).toHaveBeenCalledTimes(1);
        rechazar({error: {message: 'Sin conexión'}});
        await primera;
        expect(page.guardando()).toBe(false);
        expect(page.errorMsg()).toContain('Sin conexión');
        await ejecutar();
        expect(enviar).toHaveBeenCalledTimes(2);
        expect(page.guardando()).toBe(false);
      } finally { log.mockRestore(); }
    });
  }

  it('impide abrir edición o desactivación y enviar cambios como vendedor', async () => {
    const create = vi.fn(), actualizarCliente = vi.fn(), desactivarCliente = vi.fn();
    const page = new ClientesPage({actualizarCliente, desactivarCliente} as unknown as ClientesService,
      {esAdmin: () => false} as AuthService, {} as Router, {create} as unknown as AlertController);
    await page.abrirEditar(cliente);
    await page.confirmarDesactivar(cliente, {} as IonItemSliding);
    await page['actualizarCliente'](7, 'Cambio');
    await page['desactivarCliente'](7);
    expect(create).not.toHaveBeenCalled();
    expect(actualizarCliente).not.toHaveBeenCalled();
    expect(desactivarCliente).not.toHaveBeenCalled();
  });

  it('el diálogo de administrador contiene únicamente el nombre', async () => {
    const create = vi.fn().mockResolvedValue({present: async () => undefined, onDidDismiss: async () => undefined});
    const page = new ClientesPage({} as ClientesService, {esAdmin: () => true} as AuthService,
      {} as Router, {create} as unknown as AlertController);
    await page.abrirEditar(cliente);
    expect(create.mock.calls[0][0].inputs.map((input: {name: string}) => input.name)).toEqual(['nombre']);
  });
});
