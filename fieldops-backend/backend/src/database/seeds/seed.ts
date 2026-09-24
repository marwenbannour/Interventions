/* eslint-disable no-console */
import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { Role } from '../../common/enums/role.enum';
import { TaskPriority } from '../../common/enums/task.enums';
import { toPoint } from '../../common/utils/geo';
import { AgentProfile, AgentStatus } from '../../modules/agents/entities/agent-profile.entity';
import { Client } from '../../modules/clients/entities/client.entity';
import { Site } from '../../modules/clients/entities/site.entity';
import { Organization } from '../../modules/organizations/entities/organization.entity';
import { Zone } from '../../modules/organizations/entities/zone.entity';
import { SlaPolicy } from '../../modules/sla/entities/sla-policy.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TaskEvent } from '../../modules/tasks/entities/task-event.entity';
import { User } from '../../modules/users/entities/user.entity';
import { LINEN_WORKFLOW, STANDARD_WORKFLOW } from '../../modules/workflows/default-workflow';
import { WorkflowDefinition } from '../../modules/workflows/entities/workflow-definition.entity';

/**
 * Jeu de données de démonstration.
 *   npm run seed            → crée l'organisation "demo" si absente
 *   npm run seed -- --reset → supprime puis recrée
 */
async function main() {
  const ds = await dataSource.initialize();
  const reset = process.argv.includes('--reset');
  const orgRepo = ds.getRepository(Organization);

  const existing = await orgRepo.findOne({ where: { slug: 'demo' } });
  if (existing && !reset) {
    console.log('Organisation "demo" déjà présente — utilisez --reset pour la recréer.');
    await ds.destroy();
    return;
  }

  await ds.transaction(async (m) => {
    if (existing) {
      const org = existing.id;
      const cols: { table_name: string; column_name: string }[] = await m.query(
        `SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND column_name IN ('organizationId', 'userId')`,
      );
      const has = (t: string, c: string) => cols.some((x) => x.table_name === t && x.column_name === c);
      for (const table of [
        'sync_operations', 'evaluations', 'photos', 'task_events', 'tasks', 'sla_policies', 'workflow_definitions',
        'location_pings', 'notifications', 'device_tokens', 'refresh_tokens', 'agent_profiles', 'sites', 'clients',
        'teams', 'zones', 'audit_logs',
      ]) {
        if (has(table, 'organizationId')) {
          await m.query(`DELETE FROM "${table}" WHERE "organizationId" = $1`, [org]);
        } else if (has(table, 'userId')) {
          await m.query(`DELETE FROM "${table}" WHERE "userId" IN (SELECT id FROM users WHERE "organizationId" = $1)`, [org]);
        }
      }
      await m.query(`DELETE FROM users WHERE "organizationId" = $1`, [org]);
      await m.query(`DELETE FROM organizations WHERE id = $1`, [org]);
      console.log('Ancienne organisation "demo" supprimée.');
    }

    const org = await m.save(
      m.create(Organization, {
        name: 'FieldOps Démo — Services Généraux',
        slug: 'demo',
        settings: {
          timezone: 'Europe/Paris',
          locationIntervalSec: 30,
          trackingOnlyOnDuty: true,
          photoRetentionDays: 365 * 3,
          locationRetentionDays: 90,
          defaultGeofenceMeters: 300,
          mfaRequiredRoles: [],
        } as any,
      }),
    );
    const orgId = org.id;

    // Workflows
    const std = await m.save(
      m.create(WorkflowDefinition, {
        organizationId: orgId, code: 'STANDARD', name: 'Intervention standard (maintenance)', version: 1,
        taskTypes: ['MAINTENANCE', 'REPAIR'], isDefault: true, isActive: true, ...STANDARD_WORKFLOW,
      }),
    );
    await m.save(
      m.create(WorkflowDefinition, {
        organizationId: orgId, code: 'LINEN', name: 'Transport de linge (livraison / collecte)', version: 1,
        taskTypes: ['LINEN_DELIVERY', 'LINEN_PICKUP'], isDefault: false, isActive: true, ...LINEN_WORKFLOW,
      }),
    );

    // SLA (§9)
    await m.save(m.create(SlaPolicy, {
      organizationId: orgId, name: 'SLA par défaut', acknowledgeMinutes: 15, arrivalMinutes: 45,
      interventionMinutes: 120, closureMinutes: 180, warningMinutesBefore: 15, isActive: true,
    }));
    await m.save(m.create(SlaPolicy, {
      organizationId: orgId, name: 'SLA urgence', priority: TaskPriority.URGENT, acknowledgeMinutes: 5, arrivalMinutes: 30,
      interventionMinutes: 90, closureMinutes: 120, warningMinutesBefore: 10, isActive: true,
    }));

    // Zones
    const zoneNord = await m.save(m.create(Zone, { organizationId: orgId, name: 'Paris Nord', code: 'PN' }));
    const zoneSud = await m.save(m.create(Zone, { organizationId: orgId, name: 'Paris Sud', code: 'PS' }));

    // Clients & sites
    const clinique = await m.save(m.create(Client, {
      organizationId: orgId, name: 'Clinique Saint-Martin', code: 'CSM', email: 'contact@clinique-sm.fr',
      contractReference: 'CTR-2026-014', isActive: true,
    }));
    const hotel = await m.save(m.create(Client, {
      organizationId: orgId, name: 'Hôtel Le Grand Parc', code: 'HGP', email: 'direction@grandparc.fr',
      contractReference: 'CTR-2026-021', isActive: true,
    }));
    const siteData = [
      { client: clinique, name: 'Clinique — Bâtiment A', address: '12 rue de la Santé', postalCode: '75014', city: 'Paris', lat: 48.8338, lng: 2.3417, zone: zoneSud },
      { client: clinique, name: 'Clinique — Blanchisserie', address: '4 rue Pascal', postalCode: '75005', city: 'Paris', lat: 48.8377, lng: 2.3488, zone: zoneSud },
      { client: hotel, name: 'Hôtel — Réception', address: '88 boulevard Haussmann', postalCode: '75008', city: 'Paris', lat: 48.8744, lng: 2.3185, zone: zoneNord },
      { client: hotel, name: 'Hôtel — Lingerie', address: '15 rue de Rome', postalCode: '75008', city: 'Paris', lat: 48.8768, lng: 2.3239, zone: zoneNord },
    ];
    const sites: Site[] = [];
    for (const s of siteData) {
      sites.push(await m.save(m.create(Site, {
        organizationId: orgId, clientId: s.client.id, name: s.name, address: s.address, postalCode: s.postalCode,
        city: s.city, location: toPoint(s.lat, s.lng), geofenceMeters: 250, zoneId: s.zone.id,
        contactName: 'Accueil', contactPhone: '+33 1 00 00 00 00', isActive: true,
      })));
    }

    // Utilisateurs
    const hash = (p: string) => bcrypt.hash(p, 10);
    const mkUser = async (email: string, first: string, last: string, role: Role, pwd: string, extra: Partial<User> = {}) =>
      m.save(m.create(User, {
        organizationId: orgId, email, firstName: first, lastName: last, role, passwordHash: await hash(pwd), ...extra,
      }));

    await mkUser('admin@demo.fieldops.io', 'Alice', 'Admin', Role.ADMIN, 'Admin123!demo');
    const sup = await mkUser('superviseur@demo.fieldops.io', 'Samir', 'Dispatch', Role.SUPERVISOR, 'Superviseur123!');
    await mkUser('direction@demo.fieldops.io', 'Denise', 'Direction', Role.DIRECTION, 'Direction123!');
    await mkUser('client@clinique-sm.fr', 'Claire', 'Martin', Role.CLIENT, 'Client123!demo', { clientId: clinique.id });

    const agentsData = [
      { email: 'agent1@demo.fieldops.io', first: 'Karim', last: 'Benali', skills: ['ELECTRICITE', 'PLOMBERIE'], activity: 'MAINTENANCE', zone: zoneSud, vehicle: 'Kangoo AB-123-CD' },
      { email: 'agent2@demo.fieldops.io', first: 'Julie', last: 'Moreau', skills: ['LINGE', 'PERMIS_B'], activity: 'LINEN_TRANSPORT', zone: zoneNord, vehicle: 'Master EF-456-GH' },
      { email: 'agent3@demo.fieldops.io', first: 'Thomas', last: 'Leroy', skills: ['ELECTRICITE', 'CVC', 'PLOMBERIE'], activity: 'MAINTENANCE', zone: zoneNord, vehicle: 'Berlingo IJ-789-KL' },
    ];
    const agents: User[] = [];
    for (const a of agentsData) {
      const u = await mkUser(a.email, a.first, a.last, Role.AGENT, 'Agent123!demo', { phone: '+33 6 00 00 00 00' });
      await m.save(m.create(AgentProfile, {
        organizationId: orgId, userId: u.id, activityType: a.activity, skills: a.skills, zoneId: a.zone.id,
        status: AgentStatus.ACTIVE, validatedById: sup.id, validatedAt: new Date(), maxConcurrentTasks: 5, vehicle: a.vehicle,
        availability: { '1': ['08:00-17:00'], '2': ['08:00-17:00'], '3': ['08:00-17:00'], '4': ['08:00-17:00'], '5': ['08:00-16:00'] },
      }));
      agents.push(u);
    }

    // Interventions exemples
    const now = Date.now();
    const at = (minFromNow: number) => new Date(now + minFromNow * 60_000);
    let seq = 0;
    const year = new Date().getFullYear();
    const mkTask = async (p: {
      title: string; type: string; priority: TaskPriority; site: Site; status: string; agent?: User;
      start?: number; skills?: string[]; checklist?: string[]; description?: string;
    }) => {
      seq += 1;
      const createdAt = new Date(now - 3 * 60_000);
      const urgent = p.priority === TaskPriority.URGENT;
      const [ack, arr, inter, close] = urgent ? [5, 30, 90, 120] : [15, 45, 120, 180];
      const wf = p.type.startsWith('LINEN') ? await m.findOneByOrFail(WorkflowDefinition, { organizationId: orgId, code: 'LINEN' }) : std;
      const t = await m.save(m.create(Task, {
        organizationId: orgId,
        reference: `INT-${year}-${String(seq).padStart(6, '0')}`,
        title: p.title,
        description: p.description,
        type: p.type,
        priority: p.priority,
        status: p.status,
        workflowId: wf.id,
        clientId: p.site.clientId,
        siteId: p.site.id,
        agentId: p.agent?.id ?? null,
        createdById: sup.id,
        requiredSkills: p.skills ?? [],
        checklist: (p.checklist ?? []).map((label, i) => ({ id: `c${i + 1}`, label, required: true, done: false })),
        scheduledStart: p.start != null ? at(p.start) : null,
        scheduledEnd: p.start != null ? at(p.start + 90) : null,
        estimatedDurationMin: 60,
        assignedAt: p.agent ? new Date(now - 2 * 60_000) : null,
        plannedAt: p.status !== 'CREATED' ? new Date(now - 2 * 60_000) : null,
        ackDueAt: new Date(createdAt.getTime() + ack * 60_000),
        arrivalDueAt: new Date(createdAt.getTime() + arr * 60_000),
        interventionDueAt: new Date(createdAt.getTime() + inter * 60_000),
        closeDueAt: new Date(createdAt.getTime() + close * 60_000),
      }));
      await m.update(Task, t.id, { createdAt });
      await m.save(m.create(TaskEvent, {
        organizationId: orgId, taskId: t.id, type: 'CREATED', actorId: sup.id, toStatus: 'CREATED', occurredAt: createdAt,
      }));
      return t;
    };

    await mkTask({
      title: 'Panne éclairage couloir bloc B', type: 'MAINTENANCE', priority: TaskPriority.URGENT, site: sites[0],
      status: 'ASSIGNED', agent: agents[0], start: 10, skills: ['ELECTRICITE'],
      checklist: ['Couper le circuit', 'Remplacer le luminaire', 'Tester le circuit'],
      description: 'Plusieurs néons hors service, zone de passage patients.',
    });
    await mkTask({
      title: 'Fuite sous évier salle de soins 3', type: 'REPAIR', priority: TaskPriority.HIGH, site: sites[0],
      status: 'ASSIGNED', agent: agents[0], start: 120, skills: ['PLOMBERIE'],
      checklist: ['Identifier la fuite', 'Remplacer le joint', 'Contrôle étanchéité'],
    });
    await mkTask({
      title: 'Livraison linge propre — 40 parures', type: 'LINEN_DELIVERY', priority: TaskPriority.NORMAL, site: sites[3],
      status: 'ASSIGNED', agent: agents[1], start: 30, skills: ['LINGE'],
      checklist: ['Contrôle quantités', 'Remise au responsable lingerie'],
    });
    await mkTask({
      title: 'Collecte linge sale — étage 2', type: 'LINEN_PICKUP', priority: TaskPriority.NORMAL, site: sites[1],
      status: 'PLANNED', start: 240, skills: ['LINGE'], checklist: ['Pesée des sacs', 'Chargement véhicule'],
    });
    await mkTask({
      title: 'Maintenance préventive CTA toiture', type: 'MAINTENANCE', priority: TaskPriority.LOW, site: sites[2],
      status: 'CREATED', skills: ['CVC'], checklist: ['Remplacement filtres', 'Relevé pressions', 'Nettoyage batterie'],
    });

    await m.query(`UPDATE organizations SET "taskSeq" = $2 WHERE id = $1`, [orgId, seq]);
  });

  console.log(`
✅ Données de démonstration créées.

  Rôle         Email                            Mot de passe
  ───────────  ───────────────────────────────  ───────────────
  Admin        admin@demo.fieldops.io           Admin123!demo
  Superviseur  superviseur@demo.fieldops.io     Superviseur123!
  Direction    direction@demo.fieldops.io       Direction123!
  Agent        agent1@demo.fieldops.io          Agent123!demo   (agent2, agent3 idem)
  Client       client@clinique-sm.fr            Client123!demo
`);
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
