{ pkgs, ... }:

{
  packages = [ pkgs.mongosh ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  services.mongodb = {
    enable = true;
    # Keep this project isolated from MongoDB instances started by other devenv projects.
    additionalArgs = [ "--port" "27017" "--noauth" ];
  };

  env.MONGODB_URI = "mongodb://127.0.0.1:27017/express";
}
