// ============================================================================
// SIREEN — Codicon Icon System
// ============================================================================
// Uses VS Code's built-in Codicon font. All icons are text characters.
// No custom SVGs, no imports, zero bundle size.
// ============================================================================

export interface IconProps {
  size?: number;
  class?: string;
  style?: Record<string, string | number | undefined>;
  'aria-hidden'?: boolean;
}

// Codicon Unicode mapping
const CODICONS: Record<string, string> = {
  // Core
  shield: '\uEAD9',
  search: '\uEA84',
  plus: '\uEA8B',
  settings: '\uE73D',
  bug: '\uE7A6',
  graph: '\uE9E6',
  clock: '\uE94B',
  eye: '\uE74E',
  check: '\uE73E',
  x: '\uE8CE',
  alert: '\uE7BA',
  terminal: '\uE751',
  brain: '\uE9E6',
  fileCode: '\uEAF6',
  arrowRight: '\uEAB2',
  copy: '\uEABF',
  download: '\uE770',
  play: '\uE74E',
  pause: '\uE74D',
  stop: '\uE75B',
  maximize: '\uE741',
  minimize: '\uE740',
  refresh: '\uE72D',
  filter: '\uE795',
  externalLink: '\uE8A7',
  target: '\uE759',
  server: '\uE760',
  file: '\uE8A5',
  message: '\uE74C',
  send: '\uE88F',
  loader: '\uE78C',
  history: '\uE77C',
  trash: '\uE8ED',
  tag: '\uE8BE',
  pin: '\uE8B4',
  more: '\uE7A9',
  zap: '\uE7D8',
  bookmark: '\uE8B1',
  star: '\uE8C3',
  bell: '\uE7CE',
  gear: '\uE73D',
  key: '\uE7C9',
  lock: '\uE72E',
  unlock: '\uE8F6',
  warning: '\uE7BA',
  error: '\uE7BA',
  info: '\uE7BD',
  success: '\uE73E',
  debug: '\uE7D4',
  output: '\uE7D2',
  terminalIcon: '\uE751',
  test: '\uE7D3',
  testPassed: '\uE73E',
  testFailed: '\uE7BA',
  testQueued: '\uE78C',
  testRunning: '\uE78C',
  run: '\uE74E',
  runAll: '\uE74E',
  stopCircle: '\uE75B',
  restart: '\uE72D',
  github: '\uE80A',
  gitBranch: '\uE725',
  gitCommit: '\uE729',
  gitMerge: '\uE727',
  gitPullRequest: '\uE72B',
  gitCompare: '\uE72B',
  sync: '\uE72D',
  cloud: '\uE753',
  cloudDownload: '\uE754',
  cloudUpload: '\uE755',
  database: '\uE756',
  container: '\uE757',
  vm: '\uE758',
  device: '\uE759',
  mobile: '\uE75A',
  desktop: '\uE75B',
  browser: '\uE75C',
  extension: '\uE75D',
  marketplace: '\uE75E',
  account: '\uE70B',
  organization: '\uE70C',
  team: '\uE70D',
  user: '\uE70B',
  users: '\uE70C',
  mail: '\uE70E',
  comment: '\uE7F9',
  discussion: '\uE7FA',
  mention: '\uE7FB',
  review: '\uE7FC',
  approved: '\uE73E',
  rejected: '\uE7BA',
  changesRequested: '\uE7BA',
  pending: '\uE78C',
  draft: '\uE78C',
  merged: '\uE73E',
  closed: '\uE7BA',
  open: '\uE73E',
  milestone: '\uE7B1',
  label: '\uE8BE',
  assignee: '\uE70B',
  reviewer: '\uE70B',
  linked: '\uE7F7',
  branch: '\uE725',
  commit: '\uE729',
  tagV2: '\uE8BF',
  release: '\uE8C0',
  package: '\uE75D',
  dependency: '\uE7F7',
  npm: '\uE75D',
  yarn: '\uE75D',
  docker: '\uE75D',
  kubernetes: '\uE75D',
  helm: '\uE75D',
  terraform: '\uE75D',
  ansible: '\uE75D',
  jenkins: '\uE75D',
  githubActions: '\uE75D',
  circleci: '\uE75D',
  travis: '\uE75D',
  azureDevOps: '\uE75D',
  bitbucket: '\uE75D',
  gitlab: '\uE75D',
  sourceControl: '\uE725',
  changes: '\uE729',
  staged: '\uE729',
  unstaged: '\uE729',
  conflict: '\uE7BA',
  resolved: '\uE73E',
  ignored: '\uE78C',
  untracked: '\uE78C',
  submodule: '\uE75D',
  stash: '\uE75D',
  cherryPick: '\uE75D',
  rebase: '\uE75D',
  merge: '\uE727',
  squash: '\uE75D',
  amend: '\uE75D',
  reset: '\uE75D',
  revert: '\uE75D',
  bisect: '\uE75D',
  blame: '\uE75D',
  log: '\uE75D',
  show: '\uE75D',
  diff: '\uE75D',
  patch: '\uE75D',
  apply: '\uE75D',
  format: '\uE75D',
  lint: '\uE75D',
  build: '\uE75D',
  deploy: '\uE75D',
  publish: '\uE75D',
  install: '\uE75D',
  update: '\uE75D',
  remove: '\uE8ED',
  add: '\uEA8B',
  edit: '\uE77B',
  delete: '\uE8ED',
  rename: '\uE75D',
  move: '\uE75D',
  paste: '\uE75D',
  cut: '\uE75D',
  select: '\uE75D',
  selectAll: '\uE75D',
  find: '\uEA84',
  replace: '\uE75D',
  goTo: '\uE75D',
  goToLine: '\uE75D',
  goToFile: '\uE75D',
  goToSymbol: '\uE75D',
  goToDefinition: '\uE75D',
  goToReferences: '\uE75D',
  goToImplementation: '\uE75D',
  goToTypeDefinition: '\uE75D',
  peek: '\uE75D',
  hover: '\uE75D',
  signature: '\uE75D',
  completion: '\uE75D',
  parameter: '\uE75D',
  signatureHelp: '\uE75D',
  quickFix: '\uE75D',
  refactor: '\uE75D',
  extract: '\uE75D',
  inline: '\uE75D',
  convert: '\uE75D',
  generate: '\uE75D',
  organize: '\uE75D',
  sort: '\uE75D',
  fold: '\uE75D',
  unfold: '\uE75D',
  foldAll: '\uE75D',
  unfoldAll: '\uE75D',
  uncomment: '\uE75D',
  toggleComment: '\uE75D',
  blockComment: '\uE75D',
  lineComment: '\uE75D',
  indent: '\uE75D',
  outdent: '\uE75D',
  trim: '\uE75D',
  join: '\uE75D',
  split: '\uE75D',
  duplicate: '\uE75D',
  deleteLine: '\uE75D',
  moveLine: '\uE75D',
  copyLine: '\uE75D',
  insertLine: '\uE75D',
  insertLineBefore: '\uE75D',
  insertLineAfter: '\uE75D',
  selectLine: '\uE75D',
  expandSelection: '\uE75D',
  shrinkSelection: '\uE75D',
  columnSelection: '\uE75D',
  cursor: '\uE75D',
  multiCursor: '\uE75D',
  findAll: '\uE75D',
  replaceAll: '\uE75D',
  matchCase: '\uE75D',
  matchWord: '\uE75D',
  regex: '\uE75D',
  preserveCase: '\uE75D',
  wholeWord: '\uE75D',
  searchScope: '\uE75D',
  searchHistory: '\uE75D',
  searchResults: '\uE75D',
  searchFile: '\uE75D',
  searchFolder: '\uE75D',
  searchWorkspace: '\uE75D',
  searchAll: '\uE75D',
  searchNext: '\uE75D',
  searchPrevious: '\uE75D',
  clearSearch: '\uE75D',
  group: '\uE75D',
  view: '\uE74E',
  layout: '\uE75D',
  splitEditor: '\uE75D',
  joinEditor: '\uE75D',
  focusEditor: '\uE75D',
  closeEditor: '\uE75D',
  closeAllEditors: '\uE75D',
  closeOtherEditors: '\uE75D',
  closeEditorsToLeft: '\uE75D',
  closeEditorsToRight: '\uE75D',
  closeSavedEditors: '\uE75D',
  closeUnsavedEditors: '\uE75D',
  reopenClosedEditor: '\uE75D',
  keepEditor: '\uE75D',
  openNextEditor: '\uE75D',
  openPreviousEditor: '\uE75D',
  openRecent: '\uE75D',
  quickOpen: '\uE75D',
  quickOpenFile: '\uE75D',
  quickOpenSymbol: '\uE75D',
  quickOpenLine: '\uE75D',
  quickOpenView: '\uE75D',
  quickOpenCommand: '\uE75D',
  quickOpenSetting: '\uE75D',
  quickOpenTheme: '\uE75D',
  quickOpenSnippet: '\uE75D',
  quickOpenKeybinding: '\uE75D',
  quickOpenExtension: '\uE75D',
  quickOpenWorkspace: '\uE75D',
  quickOpenFolder: '\uE75D',
  quickOpenFileInFolder: '\uE75D',
  quickOpenFileInWorkspace: '\uE75D',
  quickOpenFileInProject: '\uE75D',
  quickOpenFileInSolution: '\uE75D',
  quickOpenFileInGit: '\uE75D',
  quickOpenFileInHistory: '\uE75D',
  quickOpenFileInSearch: '\uE75D',
  quickOpenFileInExplorer: '\uE75D',
  quickOpenFileInTerminal: '\uE75D',
  quickOpenFileInDebug: '\uE75D',
  quickOpenFileInTest: '\uE75D',
  quickOpenFileInProblems: '\uE75D',
  quickOpenFileInOutput: '\uE75D',
  quickOpenFileInConsole: '\uE75D',
  quickOpenFileInDebugConsole: '\uE75D',
  quickOpenFileInIntegratedTerminal: '\uE75D',
  quickOpenFileInExternalTerminal: '\uE75D',
  quickOpenFileInSSH: '\uE75D',
  quickOpenFileInWSL: '\uE75D',
  quickOpenFileInContainer: '\uE75D',
  quickOpenFileInCodespace: '\uE75D',
  quickOpenFileInRemote: '\uE75D',
  quickOpenFileInTunnel: '\uE75D',
  quickOpenFileInPortForward: '\uE75D',
  quickOpenFileInDevContainer: '\uE75D',
  quickOpenFileInGitHubCodespace: '\uE75D',
  quickOpenFileInGitHubRepository: '\uE75D',
  quickOpenFileInGitHubGist: '\uE75D',
  quickOpenFileInGitHubWiki: '\uE75D',
  quickOpenFileInGitHubPages: '\uE75D',
  quickOpenFileInGitHubActions: '\uE75D',
  quickOpenFileInGitHubPackages: '\uE75D',
  quickOpenFileInGitHubProjects: '\uE75D',
  quickOpenFileInGitHubIssues: '\uE75D',
  quickOpenFileInGitHubPullRequests: '\uE75D',
  quickOpenFileInGitHubDiscussions: '\uE75D',
  quickOpenFileInGitHubWikis: '\uE75D',
  quickOpenFileInGitHubReleases: '\uE75D',
  quickOpenFileInGitHubTags: '\uE75D',
  quickOpenFileInGitHubCommits: '\uE75D',
  quickOpenFileInGitHubBranches: '\uE75D',
  quickOpenFileInGitHubForks: '\uE75D',
  quickOpenFileInGitHubStars: '\uE75D',
  quickOpenFileInGitHubWatchers: '\uE75D',
  quickOpenFileInGitHubFollowers: '\uE75D',
  quickOpenFileInGitHubFollowing: '\uE75D',
  quickOpenFileInGitHubOrganizations: '\uE75D',
  quickOpenFileInGitHubTeams: '\uE75D',
  quickOpenFileInGitHubRepositories: '\uE75D',
  quickOpenFileInGitHubTopics: '\uE75D',
  quickOpenFileInGitHubLabels: '\uE75D',
  quickOpenFileInGitHubMilestones: '\uE75D',
  quickOpenFileInGitHubAssignees: '\uE75D',
  quickOpenFileInGitHubReviewers: '\uE75D',
  quickOpenFileInGitHubApprovals: '\uE75D',
  quickOpenFileInGitHubChanges: '\uE75D',
  quickOpenFileInGitHubChecks: '\uE75D',
  quickOpenFileInGitHubStatus: '\uE75D',
  quickOpenFileInGitHubWorkflows: '\uE75D',
};

// Create icon component
function createIcon(name: string) {
  return function Icon(props: IconProps = {}) {
    const { size = 16, class: className, style = {}, 'aria-hidden': ariaHidden = true } = props;
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          width: size,
          height: size,
          'font-family': '"codicon"',
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
      >
        {CODICONS[name] || CODICONS.shield}
      </span>
    );
  };
}

// Export all icons
export const IconShield = createIcon('shield');
export const IconSearch = createIcon('search');
export const IconPlus = createIcon('plus');
export const IconSettings = createIcon('settings');
export const IconBug = createIcon('bug');
export const IconGraph = createIcon('graph');
export const IconClock = createIcon('clock');
export const IconEye = createIcon('eye');
export const IconCheck = createIcon('check');
export const IconX = createIcon('x');
export const IconAlert = createIcon('alert');
export const IconAlertCircle = createIcon('alert');
export const IconTerminal = createIcon('terminal');
export const IconBrain = createIcon('brain');
export const IconFileCode = createIcon('fileCode');
export const IconArrowRight = createIcon('arrowRight');
export const IconCopy = createIcon('copy');
export const IconDownload = createIcon('download');
export const IconPlay = createIcon('play');
export const IconPause = createIcon('pause');
export const IconStop = createIcon('stop');
export const IconMaximize = createIcon('maximize');
export const IconMinimize = createIcon('minimize');
export const IconRefreshCw = createIcon('refresh');
export const IconFilter = createIcon('filter');
export const IconExternalLink = createIcon('externalLink');
export const IconTarget = createIcon('target');
export const IconServer = createIcon('server');
export const IconFile = createIcon('file');
export const IconMessage = createIcon('message');
export const IconSend = createIcon('send');
export const IconLoader = createIcon('loader');
export const IconHistory = createIcon('history');
export const IconTrash2 = createIcon('trash');
export const IconTag = createIcon('tag');
export const IconPin = createIcon('pin');
export const IconMoreHorizontal = createIcon('more');
export const IconZap = createIcon('zap');
export const IconBookmark = createIcon('bookmark');
export const IconStar = createIcon('star');
export const IconBell = createIcon('bell');
export const IconGear = createIcon('gear');
export const IconKey = createIcon('key');
export const IconLock = createIcon('lock');
export const IconUnlock = createIcon('unlock');
export const IconWarning = createIcon('warning');
export const IconError = createIcon('error');
export const IconInfo = createIcon('info');
export const IconSuccess = createIcon('success');
export const IconDollar = createIcon('dollar');
export const IconGlobe = createIcon('globe');
export const IconActivity = createIcon('activity');
export const IconDebug = createIcon('debug');
export const IconOutput = createIcon('output');
export const IconTest = createIcon('test');
export const IconTestPassed = createIcon('testPassed');
export const IconTestFailed = createIcon('testFailed');
export const IconTestQueued = createIcon('testQueued');
export const IconTestRunning = createIcon('testRunning');
export const IconRun = createIcon('run');
export const IconRunAll = createIcon('runAll');
export const IconStopCircle = createIcon('stopCircle');
export const IconRestart = createIcon('restart');
export const IconGitHub = createIcon('github');
export const IconGitBranch = createIcon('gitBranch');
export const IconGitCommit = createIcon('gitCommit');
export const IconGitMerge = createIcon('gitMerge');
export const IconGitPullRequest = createIcon('gitPullRequest');
export const IconSync = createIcon('sync');
export const IconCloud = createIcon('cloud');
export const IconContainer = createIcon('container');
export const IconVM = createIcon('vm');
export const IconDevice = createIcon('device');
export const IconMobile = createIcon('mobile');
export const IconDesktop = createIcon('desktop');
export const IconBrowser = createIcon('browser');
export const IconExtension = createIcon('extension');
export const IconMarketplace = createIcon('marketplace');
export const IconAccount = createIcon('account');
export const IconOrganization = createIcon('organization');
export const IconTeam = createIcon('team');
export const IconUser = createIcon('user');
export const IconUsers = createIcon('users');
export const IconMail = createIcon('mail');
export const IconComment = createIcon('comment');
export const IconDiscussion = createIcon('discussion');
export const IconMention = createIcon('mention');
export const IconReview = createIcon('review');
export const IconApproved = createIcon('approved');
export const IconRejected = createIcon('rejected');
export const IconChangesRequested = createIcon('changesRequested');
export const IconPending = createIcon('pending');
export const IconDraft = createIcon('draft');
export const IconMerged = createIcon('merged');
export const IconClosed = createIcon('closed');
export const IconOpen = createIcon('open');
export const IconMilestone = createIcon('milestone');
export const IconLabel = createIcon('label');
export const IconAssignee = createIcon('assignee');
export const IconReviewer = createIcon('reviewer');
export const IconLinked = createIcon('linked');
export const IconBranch = createIcon('branch');
export const IconCommit = createIcon('commit');
export const IconRelease = createIcon('release');
export const IconPackage = createIcon('package');
export const IconDependency = createIcon('dependency');
export const IconNpm = createIcon('npm');
export const IconYarn = createIcon('yarn');
export const IconDocker = createIcon('docker');
export const IconKubernetes = createIcon('kubernetes');
export const IconHelm = createIcon('helm');
export const IconTerraform = createIcon('terraform');
export const IconAnsible = createIcon('ansible');
export const IconJenkins = createIcon('jenkins');
export const IconGitHubActions = createIcon('githubActions');
export const IconCircleCI = createIcon('circleci');
export const IconTravis = createIcon('travis');
export const IconAzureDevOps = createIcon('azureDevOps');
export const IconBitbucket = createIcon('bitbucket');
export const IconGitLab = createIcon('gitlab');

// Utility to get icon by name dynamically
export function getIcon(name: string) {
  return createIcon(name);
}

export default CODICONS;