/**
 * TypeScript interfaces for Door43 Content Service (DCS) API
 */

// Base interfaces
export interface DCSApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: number;
}

export interface DCSError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Organization/Owner interfaces
export interface Owner {
  id: number;
  login: string;
  full_name: string;
  email: string;
  avatar_url: string;
  language: string;
  is_admin: boolean;
  last_login: string;
  created: string;
  restricted: boolean;
  active: boolean;
  prohibit_login: boolean;
  location: string;
  website: string;
  description: string;
  visibility: string;
  followers_count: number;
  following_count: number;
  starred_repos_count: number;
  username: string;
}

// Language interfaces
export interface Language {
  id: string;
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  region?: string;
  country?: string;
  gateway_language?: boolean;
  heart_language?: boolean;
}

// Resource interfaces
export interface Resource {
  id: number;
  owner: Owner;
  name: string;
  full_name: string;
  description: string;
  empty: boolean;
  private: boolean;
  fork: boolean;
  template: boolean;
  parent?: Resource;
  mirror: boolean;
  size: number;
  language: string;
  languages_url: string;
  html_url: string;
  ssh_url: string;
  clone_url: string;
  original_url: string;
  website: string;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  open_pr_counter: number;
  release_counter: number;
  default_branch: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  has_issues: boolean;
  internal_tracker: {
    enable_time_tracker: boolean;
    allow_only_contributors_to_track_time: boolean;
    enable_issue_dependencies: boolean;
  };
  has_wiki: boolean;
  has_pull_requests: boolean;
  has_projects: boolean;
  ignore_whitespace_conflicts: boolean;
  allow_merge_commits: boolean;
  allow_rebase: boolean;
  allow_rebase_explicit: boolean;
  allow_squash_merge: boolean;
  default_merge_style: string;
  avatar_url: string;
  internal: boolean;
  mirror_interval: string;
  mirror_updated: string;
  repo_transfer: any;
  topics: string[];
  metadata?: ResourceMetadata;
  catalog?: CatalogInfo;
}

export interface ResourceMetadata {
  dublin_core?: DublinCore;
  checking?: CheckingInfo;
  projects?: ProjectInfo[];
  ingredients?: IngredientInfo[];
}

export interface DublinCore {
  type: string;
  format: string;
  identifier: string;
  title: string;
  subject: string;
  description: string;
  language: {
    identifier: string;
    title: string;
    direction: "ltr" | "rtl";
  };
  source: {
    identifier: string;
    language: string;
    version: string;
  };
  rights: string;
  creator: string;
  contributor: string[];
  relation: string[];
  publisher: string;
  issued: string;
  modified: string;
  version: string;
}

export interface CheckingInfo {
  checking_entity: string[];
  checking_level: "1" | "2" | "3";
}

export interface ProjectInfo {
  identifier: string;
  path: string;
  categories: string[];
  sort: number;
  versification?: string;
}

export interface IngredientInfo {
  identifier: string;
  path: string;
  categories: string[];
  sort: number;
}

export interface CatalogInfo {
  prod: boolean;
  stage: string;
  lang_code: string;
  lang_name: string;
  res_type: string;
  res_name: string;
  book_code?: string;
  book_name?: string;
  branch_or_tag_name: string;
  released: string;
  zipball_url: string;
  tarball_url: string;
  catalog_url: string;
  metadata_url: string;
  metadata_json_url: string;
  metadata_api_url: string;
}

// File content interfaces
export interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: "file" | "dir";
  content?: string; // Base64 encoded
  encoding?: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Search interfaces
export interface SearchResponse<T> {
  data: T[];
  ok: boolean;
  incomplete_results: boolean;
  total_count: number;
}

// Request interfaces
export interface DCSRequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface CatalogSearchParams {
  lang?: string;
  owner?: string;
  subject?: string;
  resource?: string;
  format?: string;
  stage?: "prod" | "preprod" | "draft";
  q?: string;
  sort?: "name" | "created" | "updated" | "size" | "stars" | "forks";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface OwnerSearchParams {
  q?: string;
  uid?: number;
  limit?: number;
}

// Response wrapper for consistent error handling
export interface DCSResponse<T> {
  success: boolean;
  data?: T;
  error?: DCSError;
  statusCode?: number;
  headers?: Record<string, string>;
}
