import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

export interface FileIndex {
  uri: vscode.Uri;
  path: string;
  relativePath: string;
  type: 'contract' | 'test' | 'script' | 'config' | 'doc' | 'other';
  language: string;
  size: number;
  lastModified: number;
}

export interface ProjectStructure {
  root: string;
  folders: string[];
  files: FileIndex[];
  contracts: FileIndex[];
  tests: FileIndex[];
  scripts: FileIndex[];
  config: FileIndex[];
  dependencies: string[];
}

export interface WorkspaceDiscoveryResult {
  workspaceFolders: vscode.WorkspaceFolder[];
  projectStructure: ProjectStructure;
  knowledgeGraph: ProjectKnowledgeGraph;
}

export interface ProjectKnowledgeGraph {
  architecture: ArchitectureNode[];
  contracts: ContractNode[];
  functions: FunctionNode[];
  dependencies: DependencyEdge[];
  trustBoundaries: TrustBoundary[];
  externalCalls: ExternalCall[];
  privilegedRoles: Role[];
  stateVariables: StateVariable[];
  upgradeability: UpgradeabilityInfo;
  tests: TestInfo[];
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: 'contract' | 'library' | 'interface' | 'module';
  filePath: string;
  dependencies: string[];
}

export interface ContractNode {
  id: string;
  name: string;
  filePath: string;
  functions: string[];
  stateVariables: string[];
  inherits: string[];
  imports: string[];
}

export interface FunctionNode {
  id: string;
  name: string;
  contract: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  isPayable: boolean;
  isView: boolean;
  isPure: boolean;
  externalCalls: string[];
  stateChanges: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'inherit' | 'call';
}

export interface TrustBoundary {
  id: string;
  name: string;
  type: 'external' | 'internal' | 'privileged';
  contracts: string[];
}

export interface ExternalCall {
  id: string;
  caller: string;
  callee: string;
  function: string;
  isChecked: boolean;
}

export interface Role {
  id: string;
  name: string;
  contract: string;
  privilegedFunctions: string[];
}

export interface StateVariable {
  id: string;
  name: string;
  contract: string;
  type: string;
  visibility: string;
  isImmutable: boolean;
}

export interface UpgradeabilityInfo {
  isUpgradeable: boolean;
  proxyPattern: string | null;
  implementation: string | null;
  admin: string | null;
}

export interface TestInfo {
  id: string;
  name: string;
  filePath: string;
  contract: string;
  testType: 'unit' | 'integration' | 'fuzz' | 'invariant';
}

export class WorkspaceDiscovery {
  private readonly ignoredPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    'cache',
    '.cache',
    'coverage',
    'artifacts',
    'lib',
    'target',
    '.vscode',
    '.idea',
  ];

  async discover(): Promise<WorkspaceDiscoveryResult> {
    const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f) || [];
    
    if (workspaceFolders.length === 0) {
      throw new Error('No workspace folders open');
    }

    const projectStructures: ProjectStructure[] = [];
    
    for (const folder of workspaceFolders) {
      const structure = await this.discoverProject(folder.uri.fsPath);
      projectStructures.push(structure);
    }

    // Merge structures if multiple folders
    const mergedStructure = this.mergeStructures(projectStructures);
    const knowledgeGraph = await this.buildKnowledgeGraph(mergedStructure);

    return {
      workspaceFolders,
      projectStructure: mergedStructure,
      knowledgeGraph,
    };
  }

  private async discoverProject(rootPath: string): Promise<ProjectStructure> {
    const files: FileIndex[] = [];
    const contracts: FileIndex[] = [];
    const tests: FileIndex[] = [];
    const scripts: FileIndex[] = [];
    const config: FileIndex[] = [];

    await this.walkDirectory(rootPath, rootPath, files);

    // Categorize files
    for (const file of files) {
      if (this.isContract(file)) {
        contracts.push(file);
      } else if (this.isTest(file)) {
        tests.push(file);
      } else if (this.isScript(file)) {
        scripts.push(file);
      } else if (this.isConfig(file)) {
        config.push(file);
      }
    }

    const dependencies = await this.discoverDependencies(rootPath);

    return {
      root: rootPath,
      folders: [],
      files,
      contracts,
      tests,
      scripts,
      config,
      dependencies,
    };
  }

  private async walkDirectory(
    currentPath: string,
    rootPath: string,
    files: FileIndex[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Skip ignored patterns
        if (this.shouldIgnore(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, rootPath, files);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const ext = path.extname(entry.name);
          const language = this.getLanguageFromExtension(ext);

          const fileIndex: FileIndex = {
            uri: vscode.Uri.file(fullPath),
            path: fullPath,
            relativePath,
            type: this.categorizeFile(relativePath, ext),
            language,
            size: stats.size,
            lastModified: stats.mtimeMs,
          };

          files.push(fileIndex);
        }
      }
    } catch (error) {
      console.warn(`[WorkspaceDiscovery] Error walking ${currentPath}:`, error);
    }
  }

  private shouldIgnore(relativePath: string): boolean {
    const parts = relativePath.split(path.sep);
    return parts.some(part => 
      this.ignoredPatterns.includes(part) ||
      part.startsWith('.') ||
      part.startsWith('_')
    );
  }

  private getLanguageFromExtension(ext: string): string {
    const map: Record<string, string> = {
      '.sol': 'solidity',
      '.t.sol': 'solidity',
      '.move': 'move',
      '.rs': 'rust',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.json': 'json',
      '.toml': 'toml',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
    };
    return map[ext.toLowerCase()] || 'unknown';
  }

  private categorizeFile(relativePath: string, ext: string): FileIndex['type'] {
    const lower = relativePath.toLowerCase();
    
    if (ext === '.sol' && !lower.includes('test')) {
      return 'contract';
    }
    if (lower.includes('test') || lower.includes('spec')) {
      return 'test';
    }
    if (lower.includes('script') || lower.includes('deploy')) {
      return 'script';
    }
    if (['.json', '.toml', '.yml', '.yaml', '.env'].includes(ext)) {
      return 'config';
    }
    if (ext === '.md') {
      return 'doc';
    }
    return 'other';
  }

  private isContract(file: FileIndex): boolean {
    return file.type === 'contract' && file.language === 'solidity';
  }

  private isTest(file: FileIndex): boolean {
    return file.type === 'test';
  }

  private isScript(file: FileIndex): boolean {
    return file.type === 'script';
  }

  private isConfig(file: FileIndex): boolean {
    return file.type === 'config';
  }

  private async discoverDependencies(rootPath: string): Promise<string[]> {
    const dependencies: string[] = [];
    
    // Check package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.dependencies) {
        dependencies.push(...Object.keys(pkg.dependencies));
      }
    } catch {}

    // Check foundry.toml
    const foundryTomlPath = path.join(rootPath, 'foundry.toml');
    try {
      const content = await fs.readFile(foundryTomlPath, 'utf-8');
      // Parse remappings
      const remappings = content.match(/remappings\s*=\s*\[(.*?)\]/s);
      if (remappings) {
        dependencies.push(...remappings[1].split(',').map(s => s.trim()));
      }
    } catch {}

    return dependencies;
  }

  private mergeStructures(structures: ProjectStructure[]): ProjectStructure {
    if (structures.length === 0) {
      throw new Error('No structures to merge');
    }
    if (structures.length === 1) {
      return structures[0];
    }

    // Merge multiple workspace folders
    const allFiles = structures.flatMap(s => s.files);
    const allContracts = structures.flatMap(s => s.contracts);
    const allTests = structures.flatMap(s => s.tests);
    const allScripts = structures.flatMap(s => s.scripts);
    const allConfig = structures.flatMap(s => s.config);
    const allDependencies = [...new Set(structures.flatMap(s => s.dependencies))];

    return {
      root: structures[0].root,
      folders: structures.map(s => s.root),
      files: allFiles,
      contracts: allContracts,
      tests: allTests,
      scripts: allScripts,
      config: allConfig,
      dependencies: allDependencies,
    };
  }

  private async buildKnowledgeGraph(structure: ProjectStructure): Promise<ProjectKnowledgeGraph> {
    const contracts: ContractNode[] = [];
    const functions: FunctionNode[] = [];
    const dependencies: DependencyEdge[] = [];

    // Parse each contract file
    for (const file of structure.contracts) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const contractNode = await this.parseContract(file, content);
        contracts.push(contractNode);
        
        // Extract functions
        for (const func of contractNode.functions) {
          functions.push({
            id: `${contractNode.id}.${func}`,
            name: func,
            contract: contractNode.id,
            visibility: 'public', // Would parse from content
            isPayable: false,
            isView: false,
            isPure: false,
            externalCalls: [],
            stateChanges: [],
          });
        }
      } catch (error) {
        console.warn(`[WorkspaceDiscovery] Error parsing ${file.path}:`, error);
      }
    }

    return {
      architecture: [],
      contracts,
      functions,
      dependencies,
      trustBoundaries: [],
      externalCalls: [],
      privilegedRoles: [],
      stateVariables: [],
      upgradeability: {
        isUpgradeable: false,
        proxyPattern: null,
        implementation: null,
        admin: null,
      },
      tests: structure.tests.map(t => ({
        id: t.relativePath,
        name: path.basename(t.path),
        filePath: t.path,
        contract: '',
        testType: 'unit' as const,
      })),
    };
  }

  private async parseContract(file: FileIndex, content: string): Promise<ContractNode> {
    // Simple parsing - would use proper parser in production
    const contractNameMatch = content.match(/contract\s+(\w+)/);
    const contractName = contractNameMatch ? contractNameMatch[1] : path.basename(file.path, '.sol');
    
    const functions: string[] = [];
    const functionMatches = content.matchAll(/function\s+(\w+)\s*\(/g);
    for (const match of functionMatches) {
      functions.push(match[1]);
    }

    const inheritsMatch = content.match(/contract\s+\w+\s+is\s+([^{]+)/);
    const inherits = inheritsMatch ? inheritsMatch[1].split(',').map(s => s.trim()) : [];

    const imports: string[] = [];
    const importMatches = content.matchAll(/import\s+["']([^"']+)["']/g);
    for (const match of importMatches) {
      imports.push(match[1]);
    }

    return {
      id: file.relativePath,
      name: contractName,
      filePath: file.path,
      functions,
      stateVariables: [],
      inherits,
      imports,
    };
  }
}
