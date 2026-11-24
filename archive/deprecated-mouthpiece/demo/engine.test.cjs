'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');

const SCENARIO_IDS = ['boss_weekend', 'group_ppt_freerider', 'relative_marriage'];

test('session starts on ENTRY screen, enterCard transitions to READY, and direct fanned tap works from ENTRY', () => {
  const s0 = E.createSession('boss_weekend');
  assert.equal(s0.phase, 'ENTRY');
  assert.equal(s0.revision, 1);

  const sReady = E.enterCard(s0);
  assert.equal(sReady.phase, 'READY');
  assert.equal(sReady.revision, s0.revision);
  assert.equal(E.enterCard(sReady).phase, 'READY');

  const sDirect = E.selectRound1(s0, 'crazy');
  assert.equal(sDirect.phase, 'COUNTER');
});

test('L1 full two-round flow passes across all 3 scenarios and all 3 firepower tiers', () => {
  for (const scenarioId of SCENARIO_IDS) {
    const sc = E.getScenario(scenarioId);
    assert.equal(sc.round1Choices.length, 3);
    for (const r1 of sc.round1Choices) {
      assert.equal(E.checkSafety(r1.reply).ok, true);
      assert.equal(E.checkSafety(r1.opponentCounter).ok, true);
      for (const r2 of r1.round2Choices) {
        const s0 = E.enterCard(E.createSession(scenarioId));
        const s1 = E.selectRound1(s0, r1.id);
        assert.equal(s1.phase, 'COUNTER');
        const s2 = E.selectRound2(s1, r2.id);
        assert.equal(s2.phase, 'FINISHED');
        assert.ok(s2.receipt.badge.length <= 8, `badge too long: ${s2.receipt.badge}`);
        assert.ok(s2.receipt.receiptNote.length <= 22, `note too long: ${s2.receipt.receiptNote}`);
        assert.match(s2.receipt.demoRatioLabel, /演示样例/);
        assert.equal(E.checkSafety(s2.receipt.finalReply).ok, true);
      }
    }
  }
});

test('revision increments monotonically, resets to ENTRY, and drops stale responses', () => {
  const s0 = E.enterCard(E.createSession('boss_weekend'));
  const staleRev = s0.revision;

  const s1 = E.switchScenario(s0, 'group_ppt_freerider');
  assert.equal(s1.revision, staleRev + 1);
  assert.equal(s1.phase, 'ENTRY');
  assert.equal(E.shouldAcceptResponse(s1, staleRev), false);
  assert.equal(E.shouldAcceptResponse(s1, s1.revision), true);

  const s2 = E.resetSession(s1);
  assert.equal(s2.revision, s1.revision + 1);
  assert.equal(s2.phase, 'ENTRY');
  assert.equal(E.shouldAcceptResponse(s2, s1.revision), false);
  assert.equal(E.shouldAcceptResponse(s2, s2.revision), true);
});

test('L2 rule compiler adapts replies, returns baseline comparison, handles conflicts and fallback', () => {
  const compiled = E.compileConstraintText('甄嬛体、不提钱、婉拒借充电宝');
  assert.equal(compiled.style, 'zhenhuan');
  assert.ok(compiled.hardBans.includes('钱'));
  assert.ok(compiled.intents.includes('decline_borrow_powerbank'));

  const resBase = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '甄嬛体、不提钱、婉拒借充电宝'
  });
  assert.equal(resBase.status, 'OK');
  assert.equal(resBase.validation.valid, true);
  assert.equal(resBase.finalReply.includes('钱'), false);
  assert.notEqual(resBase.finalReply, resBase.baselineTemplateReply);

  const resCommute = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '对方赶车、我能指路、坚决不背锅'
  });
  assert.equal(resCommute.status, 'OK');
  assert.notEqual(resCommute.finalReply, resBase.finalReply);
  assert.match(resCommute.firstReply + resCommute.finalReply, /走法|指|乘车|路径/);

  const resCrazy = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '发疯文学、不提加班'
  });
  assert.equal(resCrazy.status, 'OK');
  assert.equal(resCrazy.compiled.style, 'crazy');
  assert.equal((resCrazy.firstReply + resCrazy.finalReply).includes('加班'), false);

  const resConflict = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '立刻答应同时坚决拒绝'
  });
  assert.equal(resConflict.status, 'NEEDS_PRIORITY');

  const resResolved = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '立刻答应同时坚决拒绝',
    resolvedPriority: 'prefer_accept'
  });
  assert.equal(resResolved.status, 'OK');

  const resTimeout = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '甄嬛体、不提钱',
    simulateTimeout: true
  });
  assert.equal(resTimeout.status, 'FALLBACK_SAFE');
  assert.ok(resTimeout.unappliedRules.length > 0);

  const resUnsafe = E.runL2ConstraintSandbox({
    scenarioId: 'boss_weekend',
    rawInput: '骂他傻逼去死'
  });
  assert.equal(resUnsafe.status, 'BLOCKED_UNSAFE');
});

test('PROMO_SCRIPTS are complete, safe, and free of induced-share/comment violations', () => {
  assert.equal(E.PROMO_SCRIPTS.length, 3);
  const forbidden = /(扣1解锁|评论解锁|必须分享|转发解锁|点赞解锁)/;
  for (const script of E.PROMO_SCRIPTS) {
    assert.ok(script.timeline.length >= 4);
    const allText = [
      script.title,
      script.hook3s,
      script.douyinTitle,
      script.pinnedComment,
      ...script.timeline.map((t) => t.screen + t.caption)
    ].join(' ');
    assert.equal(E.checkSafety(allText).ok, true);
    assert.equal(forbidden.test(allText), false, `Forbidden induced text in ${script.scenarioId}`);
  }
});

test('voluntary handoff encodes only public IDs and restores cleanly', () => {
  const q = E.encodeHandoff({
    scenarioId: 'boss_weekend',
    r1ChoiceId: 'crazy',
    r2ChoiceId: 'lock_9am'
  });
  assert.equal(q.includes('甄嬛'), false);
  const decoded = E.decodeHandoff(q);
  assert.equal(decoded.restored, true);
  assert.equal(decoded.scenarioId, 'boss_weekend');
  assert.equal(decoded.peerR1.id, 'crazy');
  assert.equal(decoded.peerR2.id, 'lock_9am');

  assert.equal(E.decodeHandoff('').restored, false);
  assert.equal(E.decodeHandoff('?s=bad&r1=x&r2=y&t=1234').restored, false);
});

test('telemetry records entry/dm/card funnel events and bounds envelope log to 10 items', () => {
  let tel = E.createTelemetry();
  tel = E.recordEvent(tel, 'entry_cta_tap', { scenarioId: 'boss_weekend' });
  tel = E.recordEvent(tel, 'dm_preview_open', { scenarioId: 'boss_weekend' });
  assert.equal(tel.counts.entry_cta_tap, 1);
  assert.equal(tel.counts.dm_preview_open, 1);

  for (let i = 0; i < 15; i++) {
    tel = E.recordEvent(tel, 'r1_tap', { scenarioId: 'boss_weekend', sessionId: 's1', revision: 1 });
  }
  assert.equal(tel.counts.r1_tap, 15);
  assert.equal(tel.recentEnvelopes.length, 10);
});

test('<2KB archive ring buffer enforces max items and max byte budget', () => {
  let doc = E.createEmptyArchive();
  for (let i = 0; i < 15; i++) {
    doc = E.appendArchiveCase(doc, {
      id: 'c_' + i,
      scenarioId: 'boss_weekend',
      r1Label: '体面发疯版',
      r2Label: '顺杆敲定明早',
      badge: '已读乱回宗师'
    });
  }
  assert.ok(doc.recentCases.length <= E.ARCHIVE_MAX_ITEMS);
  assert.ok(E.getArchiveByteLength(doc) < E.ARCHIVE_MAX_BYTES);
});
