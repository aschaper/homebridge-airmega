export interface PluginConfig {
  username: string;
  password: string;
  exclude?: string[];
  debug?: boolean;
  diagnostic?: boolean;
}