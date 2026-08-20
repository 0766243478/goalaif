// ============================================================================
// SIREEN — Codicon Icon System (CSS Class Based)
// ============================================================================
// Uses VS Code's built-in Codicon font via CSS classes.
// Load codicon.css in webview HTML and use <i class="codicon codicon-name">.
// ============================================================================

export interface IconProps {
  size?: number;
  class?: string;
  style?: Record<string, string | number | undefined>;
  'aria-hidden'?: boolean;
}

// Codicon class name mapping (keys match original CODICONS object keys)
const CODICON_CLASS_MAP: Record<string, string> = {
  // Core
  shield: 'codicon-shield',
  search: 'codicon-search',
  plus: 'codicon-add',
  settings: 'codicon-settings-gear',
  bug: 'codicon-bug',
  graph: 'codicon-graph',
  clock: 'codicon-clock',
  eye: 'codicon-eye',
  check: 'codicon-check',
  x: 'codicon-close',
  alert: 'codicon-warning',
  terminal: 'codicon-terminal',
  brain: 'codicon-lightbulb',
  fileCode: 'codicon-file-code',
  arrowRight: 'codicon-arrow-right',
  copy: 'codicon-copy',
  download: 'codicon-download',
  play: 'codicon-play',
  pause: 'codicon-debug-pause',
  stop: 'codicon-debug-stop',
  maximize: 'codicon-maximize',
  minimize: 'codicon-minimize',
  refresh: 'codicon-refresh',
  filter: 'codicon-filter',
  externalLink: 'codicon-external-link',
  target: 'codicon-target',
  server: 'codicon-server',
  file: 'codicon-file',
  message: 'codicon-comment',
  send: 'codicon-send',
  loader: 'codicon-loading~spin',
  history: 'codicon-history',
  trash: 'codicon-trash',
  tag: 'codicon-tag',
  pin: 'codicon-pin',
  more: 'codicon-ellipsis',
  zap: 'codicon-zap',
  bookmark: 'codicon-bookmark',
  star: 'codicon-star-full',
  bell: 'codicon-bell',
  gear: 'codicon-gear',
  key: 'codicon-key',
  lock: 'codicon-lock',
  unlock: 'codicon-unlock',
  warning: 'codicon-warning',
  error: 'codicon-error',
  info: 'codicon-info',
  success: 'codicon-pass',
  debug: 'codicon-debug',
  output: 'codicon-output',
  terminalIcon: 'codicon-terminal',
  test: 'codicon-beaker',
  testPassed: 'codicon-test-passed',
  testFailed: 'codicon-test-failed',
  testQueued: 'codicon-test-queued',
  testRunning: 'codicon-test-running',
  run: 'codicon-play',
  runAll: 'codicon-play',
  stopCircle: 'codicon-debug-stop',
  restart: 'codicon-debug-restart',
  github: 'codicon-github',
  gitBranch: 'codicon-git-branch',
  gitCommit: 'codicon-git-commit',
  gitMerge: 'codicon-git-merge',
  gitPullRequest: 'codicon-git-pull-request',
  gitCompare: 'codicon-git-compare',
  sync: 'codicon-sync',
  cloud: 'codicon-cloud',
  cloudDownload: 'codicon-cloud-download',
  cloudUpload: 'codicon-cloud-upload',
  database: 'codicon-database',
  container: 'codicon-container',
  vm: 'codicon-vm',
  device: 'codicon-device-mobile',
  mobile: 'codicon-device-mobile',
  desktop: 'codicon-desktop',
  browser: 'codicon-globe',
  extension: 'codicon-extension',
  marketplace: 'codicon-marketplace',
  account: 'codicon-account',
  organization: 'codicon-organization',
  team: 'codicon-organization',
  user: 'codicon-account',
  users: 'codicon-account',
  mail: 'codicon-mail',
  comment: 'codicon-comment',
  discussion: 'codicon-comment-discussion',
  mention: 'codicon-mention',
  review: 'codicon-code-review',
  approved: 'codicon-check',
  rejected: 'codicon-x',
  changesRequested: 'codicon-git-pull-request',
  pending: 'codicon-clock',
  draft: 'codicon-file',
  merged: 'codicon-git-merge',
  closed: 'codicon-git-closed',
  open: 'codicon-git-pull-request',
  milestone: 'codicon-milestone',
  label: 'codicon-tag',
  assignee: 'codicon-person',
  reviewer: 'codicon-person',
  linked: 'codicon-link',
  branch: 'codicon-git-branch',
  commit: 'codicon-git-commit',
  tagV2: 'codicon-tag',
  release: 'codicon-tag',
  package: 'codicon-package',
  dependency: 'codicon-library',
  npm: 'codicon-package',
  yarn: 'codicon-package',
  docker: 'codicon-container',
  kubernetes: 'codicon-container',
  helm: 'codicon-container',
  terraform: 'codicon-container',
  ansible: 'codicon-container',
  jenkins: 'codicon-container',
  githubActions: 'codicon-workflow',
  circleci: 'codicon-workflow',
  travis: 'codicon-workflow',
  azureDevOps: 'codicon-workflow',
  bitbucket: 'codicon-repo',
  gitlab: 'codicon-repo',
  sourceControl: 'codicon-source-control',
  changes: 'codicon-git-branch',
  staged: 'codicon-git-staged',
  unstaged: 'codicon-git-unstaged',
  conflict: 'codicon-warning',
  resolved: 'codicon-check',
  ignored: 'codicon-circle-slash',
  untracked: 'codicon-circle-outline',
  submodule: 'codicon-repo',
  stash: 'codicon-git-stash',
  cherryPick: 'codicon-git-commit',
  rebase: 'codicon-git-rebase',
  merge: 'codicon-git-merge',
  squash: 'codicon-git-squash',
  amend: 'codicon-git-commit',
  reset: 'codicon-history',
  revert: 'codicon-git-revert',
  bisect: 'codicon-search',
  blame: 'codicon-comment',
  log: 'codicon-history',
  show: 'codicon-eye',
  diff: 'codicon-diff',
  patch: 'codicon-diff',
  apply: 'codicon-diff',
  format: 'codicon-format',
  lint: 'codicon-sparkle',
  build: 'codicon-tools',
  deploy: 'codicon-rocket',
  publish: 'codicon-package',
  install: 'codicon-package',
  update: 'codicon-cloud-download',
  remove: 'codicon-trash',
  add: 'codicon-add',
  edit: 'codicon-edit',
  delete: 'codicon-trash',
  rename: 'codicon-edit',
  move: 'codicon-move',
  paste: 'codicon-paste',
  cut: 'codicon-cut',
  select: 'codicon-select',
  selectAll: 'codicon-select',
  find: 'codicon-search',
  replace: 'codicon-replace',
  goTo: 'codicon-go-to-file',
  goToLine: 'codicon-go-to-line',
  goToFile: 'codicon-go-to-file',
  goToSymbol: 'codicon-symbol-method',
  goToDefinition: 'codicon-go-to-definition',
  goToReferences: 'codicon-go-to-references',
  goToImplementation: 'codicon-go-to-implementation',
  goToTypeDefinition: 'codicon-go-to-type-definition',
  peek: 'codicon-peek',
  hover: 'codicon-hover',
  signature: 'codicon-signature',
  completion: 'codicon-intellisense',
  parameter: 'codicon-parameter',
  signatureHelp: 'codicon-parameter',
  quickFix: 'codicon-lightbulb',
  refactor: 'codicon-refactor',
  extract: 'codicon-extract',
  inline: 'codicon-inline',
  convert: 'codicon-convert',
  generate: 'codicon-generate',
  organize: 'codicon-organize',
  sort: 'codicon-sort',
  fold: 'codicon-fold',
  unfold: 'codicon-unfold',
  foldAll: 'codicon-fold-all',
  unfoldAll: 'codicon-unfold-all',
  uncomment: 'codicon-comment',
  toggleComment: 'codicon-comment',
  blockComment: 'codicon-comment',
  lineComment: 'codicon-comment',
  indent: 'codicon-indent',
  outdent: 'codicon-outdent',
  trim: 'codicon-trim',
  join: 'codicon-join',
  split: 'codicon-split',
  duplicate: 'codicon-copy',
  deleteLine: 'codicon-trash',
  moveLine: 'codicon-move',
  copyLine: 'codicon-copy',
  insertLine: 'codicon-add',
  insertLineBefore: 'codicon-add',
  insertLineAfter: 'codicon-add',
  selectLine: 'codicon-select',
  expandSelection: 'codicon-expand',
  shrinkSelection: 'codicon-shrink',
  columnSelection: 'codicon-select',
  cursor: 'codicon-cursor',
  multiCursor: 'codicon-multi-cursor',
  findAll: 'codicon-search',
  replaceAll: 'codicon-replace',
  matchCase: 'codicon-match-case',
  matchWord: 'codicon-match-word',
  regex: 'codicon-regex',
  preserveCase: 'codicon-preserve-case',
  wholeWord: 'codicon-whole-word',
  searchScope: 'codicon-scope',
  searchHistory: 'codicon-history',
  searchResults: 'codicon-search',
  searchFile: 'codicon-file',
  searchFolder: 'codicon-folder',
  searchWorkspace: 'codicon-folder-opened',
  searchAll: 'codicon-search',
  searchNext: 'codicon-arrow-down',
  searchPrevious: 'codicon-arrow-up',
  clearSearch: 'codicon-clear',
  group: 'codicon-group',
  view: 'codicon-layout',
  layout: 'codicon-layout',
  splitEditor: 'codicon-split-horizontal',
  joinEditor: 'codicon-split-vertical',
  focusEditor: 'codicon-focus',
  closeEditor: 'codicon-close',
  closeAllEditors: 'codicon-close-all',
  closeOtherEditors: 'codicon-close-other',
  closeEditorsToLeft: 'codicon-close-left',
  closeEditorsToRight: 'codicon-close-right',
  closeSavedEditors: 'codicon-close-saved',
  closeUnsavedEditors: 'codicon-close-unsaved',
  reopenClosedEditor: 'codicon-reopen',
  keepEditor: 'codicon-pin',
  openNextEditor: 'codicon-arrow-right',
  openPreviousEditor: 'codicon-arrow-left',
  openRecent: 'codicon-history',
  quickOpen: 'codicon-quick-open',
  quickOpenFile: 'codicon-file',
  quickOpenSymbol: 'codicon-symbol-method',
  quickOpenLine: 'codicon-go-to-line',
  quickOpenView: 'codicon-view',
  quickOpenCommand: 'codicon-terminal-cmd',
  quickOpenSetting: 'codicon-settings-gear',
  quickOpenTheme: 'codicon-color-theme',
  quickOpenSnippet: 'codicon-snippet',
  quickOpenKeybinding: 'codicon-keybinding',
  quickOpenExtension: 'codicon-extension',
  quickOpenWorkspace: 'codicon-workspace',
  quickOpenFolder: 'codicon-folder',
  quickOpenFileInFolder: 'codicon-file',
  quickOpenFileInWorkspace: 'codicon-file',
  quickOpenFileInProject: 'codicon-file',
  quickOpenFileInSolution: 'codicon-file',
  quickOpenFileInGit: 'codicon-file',
  quickOpenFileInHistory: 'codicon-file',
  quickOpenFileInSearch: 'codicon-file',
  quickOpenFileInExplorer: 'codicon-file',
  quickOpenFileInTerminal: 'codicon-file',
  quickOpenFileInDebug: 'codicon-file',
  quickOpenFileInTest: 'codicon-file',
  quickOpenFileInProblems: 'codicon-file',
  quickOpenFileInOutput: 'codicon-file',
  quickOpenFileInConsole: 'codicon-file',
  quickOpenFileInDebugConsole: 'codicon-file',
  quickOpenFileInIntegratedTerminal: 'codicon-file',
  quickOpenFileInExternalTerminal: 'codicon-file',
  quickOpenFileInSSH: 'codicon-file',
  quickOpenFileInWSL: 'codicon-file',
  quickOpenFileInContainer: 'codicon-file',
  quickOpenFileInCodespace: 'codicon-file',
  quickOpenFileInGitHubCodespace: 'codicon-file',
  quickOpenFileInGitHubRepository: 'codicon-file',
  quickOpenFileInGitHubGist: 'codicon-file',
  quickOpenFileInGitHubWiki: 'codicon-file',
  quickOpenFileInGitHubPages: 'codicon-file',
  quickOpenFileInGitHubActions: 'codicon-file',
  quickOpenFileInGitHubPackages: 'codicon-file',
  quickOpenFileInGitHubProjects: 'codicon-file',
  quickOpenFileInGitHubIssues: 'codicon-file',
  quickOpenFileInGitHubPullRequests: 'codicon-file',
  quickOpenFileInGitHubDiscussions: 'codicon-file',
  quickOpenFileInGitHubWikis: 'codicon-file',
  quickOpenFileInGitHubReleases: 'codicon-file',
  quickOpenFileInGitHubTags: 'codicon-file',
  quickOpenFileInGitHubCommits: 'codicon-file',
  quickOpenFileInGitHubBranches: 'codicon-file',
  quickOpenFileInGitHubForks: 'codicon-file',
  quickOpenFileInGitHubStars: 'codicon-file',
  quickOpenFileInGitHubWatchers: 'codicon-file',
  quickOpenFileInGitHubFollowers: 'codicon-file',
  quickOpenFileInGitHubFollowing: 'codicon-file',
  quickOpenFileInGitHubOrganizations: 'codicon-file',
  quickOpenFileInGitHubTeams: 'codicon-file',
  quickOpenFileInGitHubRepositories: 'codicon-file',
  quickOpenFileInGitHubTopics: 'codicon-file',
  quickOpenFileInGitHubLabels: 'codicon-file',
  quickOpenFileInGitHubMilestones: 'codicon-file',
  quickOpenFileInGitHubAssignees: 'codicon-file',
  quickOpenFileInGitHubReviewers: 'codicon-file',
  quickOpenFileInGitHubApprovals: 'codicon-file',
  quickOpenFileInGitHubChanges: 'codicon-file',
  quickOpenFileInGitHubChecks: 'codicon-file',
  quickOpenFileInGitHubStatus: 'codicon-file',
  quickOpenFileInGitHubWorkflows: 'codicon-file',
};

// Create icon component using CSS class
function createIcon(className: string) {
  return function Icon(props: IconProps = {}) {
    const { size = 16, class: classNameProp, style = {}, 'aria-hidden': ariaHidden = true } = props;
    const cssClass = `codicon ${className} ${classNameProp || ''}`.trim();
    return (
      <i
        className={cssClass}
        style={{
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: size,
          height: size,
          'font-size': size,
          'font-style': 'normal',
          'font-weight': 'normal',
          'font-variant': 'normal',
          'text-rendering': 'auto',
          'line-height': 1,
          '-webkit-font-smoothing': 'antialiased',
          ...style,
        }}
        aria-hidden={ariaHidden}
      />
    );
  };
}

// Export all icons using CSS class names
export const IconShield = createIcon(CODICON_CLASS_MAP.shield);
export const IconSearch = createIcon(CODICON_CLASS_MAP.search);
export const IconPlus = createIcon(CODICON_CLASS_MAP.plus);
export const IconSettings = createIcon(CODICON_CLASS_MAP.settings);
export const IconBug = createIcon(CODICON_CLASS_MAP.bug);
export const IconGraph = createIcon(CODICON_CLASS_MAP.graph);
export const IconClock = createIcon(CODICON_CLASS_MAP.clock);
export const IconEye = createIcon(CODICON_CLASS_MAP.eye);
export const IconCheck = createIcon(CODICON_CLASS_MAP.check);
export const IconX = createIcon(CODICON_CLASS_MAP.x);
export const IconAlert = createIcon(CODICON_CLASS_MAP.alert);
export const IconAlertCircle = createIcon(CODICON_CLASS_MAP.alert);
export const IconTerminal = createIcon(CODICON_CLASS_MAP.terminal);
export const IconBrain = createIcon(CODICON_CLASS_MAP.brain);
export const IconFileCode = createIcon(CODICON_CLASS_MAP.fileCode);
export const IconArrowRight = createIcon(CODICON_CLASS_MAP.arrowRight);
export const IconCopy = createIcon(CODICON_CLASS_MAP.copy);
export const IconDownload = createIcon(CODICON_CLASS_MAP.download);
export const IconPlay = createIcon(CODICON_CLASS_MAP.play);
export const IconPause = createIcon(CODICON_CLASS_MAP.pause);
export const IconStop = createIcon(CODICON_CLASS_MAP.stop);
export const IconMaximize = createIcon(CODICON_CLASS_MAP.maximize);
export const IconMinimize = createIcon(CODICON_CLASS_MAP.minimize);
export const IconRefreshCw = createIcon(CODICON_CLASS_MAP.refresh);
export const IconFilter = createIcon(CODICON_CLASS_MAP.filter);
export const IconExternalLink = createIcon(CODICON_CLASS_MAP.externalLink);
export const IconTarget = createIcon(CODICON_CLASS_MAP.target);
export const IconServer = createIcon(CODICON_CLASS_MAP.server);
export const IconFile = createIcon(CODICON_CLASS_MAP.file);
export const IconMessage = createIcon(CODICON_CLASS_MAP.message);
export const IconSend = createIcon(CODICON_CLASS_MAP.send);
export const IconLoader = createIcon(CODICON_CLASS_MAP.loader);
export const IconHistory = createIcon(CODICON_CLASS_MAP.history);
export const IconTrash2 = createIcon(CODICON_CLASS_MAP.trash);
export const IconTag = createIcon(CODICON_CLASS_MAP.tag);
export const IconPin = createIcon(CODICON_CLASS_MAP.pin);
export const IconMoreHorizontal = createIcon(CODICON_CLASS_MAP.more);
export const IconZap = createIcon(CODICON_CLASS_MAP.zap);
export const IconBookmark = createIcon(CODICON_CLASS_MAP.bookmark);
export const IconStar = createIcon(CODICON_CLASS_MAP.star);
export const IconBell = createIcon(CODICON_CLASS_MAP.bell);
export const IconGear = createIcon(CODICON_CLASS_MAP.gear);
export const IconKey = createIcon(CODICON_CLASS_MAP.key);
export const IconLock = createIcon(CODICON_CLASS_MAP.lock);
export const IconUnlock = createIcon(CODICON_CLASS_MAP.unlock);
export const IconWarning = createIcon(CODICON_CLASS_MAP.warning);
export const IconError = createIcon(CODICON_CLASS_MAP.error);
export const IconInfo = createIcon(CODICON_CLASS_MAP.info);
export const IconSuccess = createIcon(CODICON_CLASS_MAP.success);
export const IconDollar = createIcon('codicon-dollar');
export const IconGlobe = createIcon(CODICON_CLASS_MAP.browser);
export const IconActivity = createIcon('codicon-pulse');
export const IconDebug = createIcon(CODICON_CLASS_MAP.debug);
export const IconOutput = createIcon(CODICON_CLASS_MAP.output);
export const IconTest = createIcon(CODICON_CLASS_MAP.test);
export const IconTestPassed = createIcon(CODICON_CLASS_MAP.testPassed);
export const IconTestFailed = createIcon(CODICON_CLASS_MAP.testFailed);
export const IconTestQueued = createIcon(CODICON_CLASS_MAP.testQueued);
export const IconTestRunning = createIcon(CODICON_CLASS_MAP.testRunning);
export const IconRun = createIcon(CODICON_CLASS_MAP.run);
export const IconRunAll = createIcon(CODICON_CLASS_MAP.runAll);
export const IconStopCircle = createIcon(CODICON_CLASS_MAP.stopCircle);
export const IconRestart = createIcon(CODICON_CLASS_MAP.restart);
export const IconGitHub = createIcon(CODICON_CLASS_MAP.github);
export const IconGitBranch = createIcon(CODICON_CLASS_MAP.gitBranch);
export const IconGitCommit = createIcon(CODICON_CLASS_MAP.gitCommit);
export const IconGitMerge = createIcon(CODICON_CLASS_MAP.gitMerge);
export const IconGitPullRequest = createIcon(CODICON_CLASS_MAP.gitPullRequest);
export const IconSync = createIcon(CODICON_CLASS_MAP.sync);
export const IconCloud = createIcon(CODICON_CLASS_MAP.cloud);
export const IconContainer = createIcon(CODICON_CLASS_MAP.container);
export const IconVM = createIcon(CODICON_CLASS_MAP.vm);
export const IconDevice = createIcon(CODICON_CLASS_MAP.device);
export const IconMobile = createIcon(CODICON_CLASS_MAP.mobile);
export const IconDesktop = createIcon(CODICON_CLASS_MAP.desktop);
export const IconBrowser = createIcon(CODICON_CLASS_MAP.browser);
export const IconExtension = createIcon(CODICON_CLASS_MAP.extension);
export const IconMarketplace = createIcon(CODICON_CLASS_MAP.marketplace);
export const IconAccount = createIcon(CODICON_CLASS_MAP.account);
export const IconOrganization = createIcon(CODICON_CLASS_MAP.organization);
export const IconTeam = createIcon(CODICON_CLASS_MAP.team);
export const IconUser = createIcon(CODICON_CLASS_MAP.user);
export const IconUsers = createIcon(CODICON_CLASS_MAP.users);
export const IconMail = createIcon(CODICON_CLASS_MAP.mail);
export const IconComment = createIcon(CODICON_CLASS_MAP.comment);
export const IconDiscussion = createIcon(CODICON_CLASS_MAP.discussion);
export const IconMention = createIcon(CODICON_CLASS_MAP.mention);
export const IconReview = createIcon(CODICON_CLASS_MAP.review);
export const IconApproved = createIcon(CODICON_CLASS_MAP.approved);
export const IconRejected = createIcon(CODICON_CLASS_MAP.rejected);
export const IconChangesRequested = createIcon(CODICON_CLASS_MAP.changesRequested);
export const IconPending = createIcon(CODICON_CLASS_MAP.pending);
export const IconDraft = createIcon(CODICON_CLASS_MAP.draft);
export const IconMerged = createIcon(CODICON_CLASS_MAP.merged);
export const IconClosed = createIcon(CODICON_CLASS_MAP.closed);
export const IconOpen = createIcon(CODICON_CLASS_MAP.open);
export const IconMilestone = createIcon(CODICON_CLASS_MAP.milestone);
export const IconLabel = createIcon(CODICON_CLASS_MAP.label);
export const IconAssignee = createIcon(CODICON_CLASS_MAP.assignee);
export const IconReviewer = createIcon(CODICON_CLASS_MAP.reviewer);
export const IconLinked = createIcon(CODICON_CLASS_MAP.linked);
export const IconBranch = createIcon(CODICON_CLASS_MAP.branch);
export const IconCommit = createIcon(CODICON_CLASS_MAP.commit);
export const IconRelease = createIcon(CODICON_CLASS_MAP.release);
export const IconPackage = createIcon(CODICON_CLASS_MAP.package);
export const IconDependency = createIcon(CODICON_CLASS_MAP.dependency);
export const IconNpm = createIcon(CODICON_CLASS_MAP.npm);
export const IconYarn = createIcon(CODICON_CLASS_MAP.yarn);
export const IconDocker = createIcon(CODICON_CLASS_MAP.docker);
export const IconKubernetes = createIcon(CODICON_CLASS_MAP.kubernetes);
export const IconHelm = createIcon(CODICON_CLASS_MAP.helm);
export const IconTerraform = createIcon(CODICON_CLASS_MAP.terraform);
export const IconAnsible = createIcon(CODICON_CLASS_MAP.ansible);
export const IconJenkins = createIcon(CODICON_CLASS_MAP.jenkins);
export const IconGitHubActions = createIcon(CODICON_CLASS_MAP.githubActions);
export const IconCircleCI = createIcon(CODICON_CLASS_MAP.circleci);
export const IconTravis = createIcon(CODICON_CLASS_MAP.travis);
export const IconAzureDevOps = createIcon(CODICON_CLASS_MAP.azureDevOps);
export const IconBitbucket = createIcon(CODICON_CLASS_MAP.bitbucket);
export const IconGitLab = createIcon(CODICON_CLASS_MAP.gitlab);

// Utility to get icon by name dynamically
export function getIcon(name: string) {
  const className = CODICON_CLASS_MAP[name] || CODICON_CLASS_MAP.shield;
  return createIcon(className);
}

export default CODICON_CLASS_MAP;