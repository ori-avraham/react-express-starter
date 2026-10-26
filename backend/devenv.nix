{ pkgs, ... }:

{
  packages = [ pkgs.mongosh ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  services.mongodb.enable = true;

  env.MONGODB_URI = "mongodb://127.0.0.1:27017/express";
}
