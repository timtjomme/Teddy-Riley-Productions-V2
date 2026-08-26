<?php
declare(strict_types=1);
session_start();

$configFile = __DIR__ . '/config.php';
$hasConfig = is_readable($configFile);
$config = $hasConfig ? require $configFile : ['dashboard_password' => null];

$error = null;
$setupError = null;

// First visit ever: no config.php on the server yet (it's gitignored, so a
// git-deployed copy of this site never has one) — let whoever gets here
// first set the password, written straight to the server, never through git.
if (!$hasConfig && isset($_POST['new_password'])) {
    $new = (string) $_POST['new_password'];
    if (strlen($new) < 8) {
        $setupError = 'Use at least 8 characters.';
    } else {
        $php = "<?php\n// Written by dashboard.php on first setup. Gitignored — never touches the repo.\nreturn [\n    'dashboard_password' => " . var_export($new, true) . ",\n];\n";
        if (file_put_contents($configFile, $php, LOCK_EX) !== false) {
            $hasConfig = true;
            $_SESSION['trp_analytics_authed'] = true;
        } else {
            $setupError = "Couldn't write config.php — check the analytics/ folder is writable, or create it by hand from config.example.php.";
        }
    }
}

if ($hasConfig && isset($_POST['password'])) {
    if ($config['dashboard_password'] !== null && hash_equals((string) $config['dashboard_password'], (string) $_POST['password'])) {
        $_SESSION['trp_analytics_authed'] = true;
    } else {
        $error = 'Wrong password.';
    }
}
if (isset($_GET['logout'])) {
    unset($_SESSION['trp_analytics_authed']);
}

$authed = $_SESSION['trp_analytics_authed'] ?? false;

function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Visits — Teddy Riley Productions</title>
<link rel="icon" href="../favicon.png" type="image/png">
<style>
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 'Helvetica Neue',Helvetica,Arial,sans-serif;color:#121214;background:#f4f4f6}
  .wrap{max-width:1040px;margin:0 auto;padding:40px 20px 80px}
  h1{font-weight:300;font-size:32px;margin:0 0 28px;letter-spacing:-0.01em}
  h2{font-weight:600;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#63636b;margin:0 0 14px}
  a{color:#121214}
  .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .logout{font-size:13px;color:#63636b;text-decoration:none}
  .login{max-width:320px;margin:120px auto;text-align:center}
  .login input{width:100%;padding:11px 13px;border:1px solid rgba(0,0,0,0.16);border-radius:12px;font-size:15px;margin-top:16px}
  .login button{width:100%;margin-top:12px;padding:12px;border:none;border-radius:12px;background:#121214;color:#fff;font:600 13px/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer}
  .err{color:#d5443f;font-size:13px;margin-top:10px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:36px}
  .stat{background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:18px}
  .stat .n{font-size:28px;font-weight:300}
  .stat .l{font-size:12px;color:#63636b;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px}
  .range{display:flex;gap:8px;margin-bottom:20px}
  .range a{font-size:13px;padding:6px 14px;border-radius:999px;border:1px solid rgba(0,0,0,0.16);text-decoration:none;color:#63636b}
  .range a.is-current{background:#121214;color:#fff;border-color:#121214}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px}
  @media (max-width:700px){.grid2{grid-template-columns:1fr}}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.08)}
  th,td{text-align:left;padding:9px 14px;font-size:14px;border-bottom:1px solid rgba(0,0,0,0.06)}
  th{font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#63636b;font-weight:600}
  tr:last-child td{border-bottom:none}
  td.n{text-align:right;color:#63636b}
  .bars{display:flex;align-items:flex-end;gap:3px;height:120px;background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:16px}
  .bar{flex:1;background:#121214;border-radius:3px 3px 0 0;min-height:2px}
  .bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
  .bar-label{font-size:9px;color:#9a9aa4;margin-top:4px;writing-mode:vertical-rl}
  .empty{color:#9a9aa4;font-size:14px;padding:20px}
</style>

<?php if (!$authed): ?>
<div class="login">
  <h1 style="font-size:22px">Visits</h1>
  <?php if (!$hasConfig): ?>
    <p style="color:#63636b;font-size:13px;margin:0">First time here — set a password for this dashboard.</p>
    <form method="post">
      <input type="password" name="new_password" placeholder="Choose a password" autofocus minlength="8">
      <button type="submit">Set password</button>
    </form>
    <?php if ($setupError): ?><p class="err"><?= h($setupError) ?></p><?php endif; ?>
  <?php else: ?>
    <form method="post">
      <input type="password" name="password" placeholder="Password" autofocus>
      <button type="submit">Log in</button>
    </form>
    <?php if ($error): ?><p class="err"><?= h($error) ?></p><?php endif; ?>
  <?php endif; ?>
</div>
<?php
exit;
endif;

// ---- load + parse the log -------------------------------------------------
$logFile = __DIR__ . '/visits.log';
$rows = [];
if (is_readable($logFile)) {
    foreach (file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $row = json_decode($line, true);
        if (is_array($row)) $rows[] = $row;
    }
}

$range = $_GET['range'] ?? '30';
$days = in_array($range, ['7', '30', '90', 'all'], true) ? $range : '30';
$cutoff = $days === 'all' ? null : (new DateTimeImmutable("-{$days} days"))->getTimestamp();

$rows = array_filter($rows, function ($r) use ($cutoff) {
    if ($cutoff === null) return true;
    $t = strtotime($r['t'] ?? '');
    return $t !== false && $t >= $cutoff;
});

$pageviews = array_values(array_filter($rows, fn($r) => ($r['type'] ?? '') === 'pageview'));
$durations = array_values(array_filter($rows, fn($r) => ($r['type'] ?? '') === 'duration'));
$events    = array_values(array_filter($rows, fn($r) => ($r['type'] ?? '') === 'event'));

$sessions = array_unique(array_map(fn($r) => $r['sid'] ?? '', $rows));
$sessions = array_filter($sessions, fn($s) => $s !== '');

$byDay = [];
foreach ($pageviews as $r) {
    $t = strtotime($r['t'] ?? '');
    if ($t === false) continue;
    $d = date('Y-m-d', $t);
    $byDay[$d] = ($byDay[$d] ?? 0) + 1;
}
ksort($byDay);

$byPage = [];
foreach ($pageviews as $r) {
    $p = $r['page'] ?: '(unknown)';
    $byPage[$p] = ($byPage[$p] ?? 0) + 1;
}
arsort($byPage);

$byCountry = [];
foreach ($pageviews as $r) {
    $c = $r['country'] ?: 'Unknown';
    $byCountry[$c] = ($byCountry[$c] ?? 0) + 1;
}
arsort($byCountry);

$byCity = [];
foreach ($pageviews as $r) {
    if (!$r['city']) continue;
    $c = $r['city'] . ', ' . ($r['country'] ?: '?');
    $byCity[$c] = ($byCity[$c] ?? 0) + 1;
}
arsort($byCity);

$referrers = [];
foreach ($pageviews as $r) {
    $ref = $r['ref'] ?? null;
    if (!$ref) continue;
    $host = parse_url($ref, PHP_URL_HOST);
    if (!$host || str_contains($host, 'teddyrileyproductions.com') || str_contains($host, 'localhost')) continue;
    $referrers[$host] = ($referrers[$host] ?? 0) + 1;
}
arsort($referrers);

$byEvent = [];
foreach ($events as $r) {
    $n = $r['name'] ?: '(unnamed)';
    $byEvent[$n] = ($byEvent[$n] ?? 0) + 1;
}
arsort($byEvent);

$avgDur = count($durations) ? array_sum(array_map(fn($r) => (int) ($r['dur'] ?? 0), $durations)) / count($durations) : 0;

$mobile = 0;
foreach ($pageviews as $r) {
    if (($r['vw'] ?? 0) > 0 && $r['vw'] < 768) $mobile++;
}
$mobilePct = count($pageviews) ? round($mobile / count($pageviews) * 100) : 0;
?>

<div class="wrap">
  <div class="top">
    <h1>Visits</h1>
    <a class="logout" href="?logout=1">Log out</a>
  </div>

  <div class="range">
    <?php foreach (['7' => '7 days', '30' => '30 days', '90' => '90 days', 'all' => 'All time'] as $k => $label): $k = (string) $k; ?>
      <a href="?range=<?= $k ?>" class="<?= $days === $k ? 'is-current' : '' ?>"><?= h($label) ?></a>
    <?php endforeach; ?>
  </div>

  <div class="stats">
    <div class="stat"><div class="n"><?= count($pageviews) ?></div><div class="l">Pageviews</div></div>
    <div class="stat"><div class="n"><?= count($sessions) ?></div><div class="l">Visitors</div></div>
    <div class="stat"><div class="n"><?= $avgDur ? gmdate('i:s', (int) $avgDur) : '—' ?></div><div class="l">Avg. time on page</div></div>
    <div class="stat"><div class="n"><?= $mobilePct ?>%</div><div class="l">Mobile</div></div>
  </div>

  <h2>Pageviews by day</h2>
  <?php if ($byDay): ?>
  <div class="bars">
    <?php $max = max($byDay); foreach ($byDay as $d => $n): ?>
      <div class="bar-wrap">
        <div class="bar" style="height:<?= max(2, round($n / $max * 100)) ?>%" title="<?= h($d) ?>: <?= $n ?>"></div>
      </div>
    <?php endforeach; ?>
  </div>
  <?php else: ?><p class="empty">No pageviews yet in this range.</p><?php endif; ?>

  <div class="grid2" style="margin-top:36px">
    <div>
      <h2>Top pages</h2>
      <table>
        <?php if ($byPage): foreach (array_slice($byPage, 0, 12, true) as $p => $n): ?>
        <tr><td><?= h($p) ?></td><td class="n"><?= $n ?></td></tr>
        <?php endforeach; else: ?><tr><td class="empty">No data</td></tr><?php endif; ?>
      </table>
    </div>
    <div>
      <h2>Top locations</h2>
      <table>
        <?php if ($byCountry): foreach (array_slice($byCountry, 0, 12, true) as $c => $n): ?>
        <tr><td><?= h($c) ?></td><td class="n"><?= $n ?></td></tr>
        <?php endforeach; else: ?><tr><td class="empty">No data</td></tr><?php endif; ?>
      </table>
    </div>
  </div>

  <div class="grid2">
    <div>
      <h2>Behaviour</h2>
      <table>
        <?php if ($byEvent): foreach ($byEvent as $n => $c): ?>
        <tr><td><?= h($n) ?></td><td class="n"><?= $c ?></td></tr>
        <?php endforeach; else: ?><tr><td class="empty">No events</td></tr><?php endif; ?>
      </table>
    </div>
    <div>
      <h2>Referrers</h2>
      <table>
        <?php if ($referrers): foreach (array_slice($referrers, 0, 12, true) as $r => $n): ?>
        <tr><td><?= h($r) ?></td><td class="n"><?= $n ?></td></tr>
        <?php endforeach; else: ?><tr><td class="empty">Direct traffic only</td></tr><?php endif; ?>
      </table>
    </div>
  </div>

  <?php if ($byCity): ?>
  <h2>Top cities</h2>
  <table>
    <?php foreach (array_slice($byCity, 0, 15, true) as $c => $n): ?>
    <tr><td><?= h($c) ?></td><td class="n"><?= $n ?></td></tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>
</div>
