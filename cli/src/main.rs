mod args;
mod executor;
mod interactive;
mod output;

use args::Args;
use build_cleaner_core::log;
use clap::Parser;
use executor::CommandExecutor;

fn main() {
    let args = Args::parse();

    if args.debug {
        log::init_logger(::log::LevelFilter::Debug);
    } else if args.verbose {
        log::init_logger(::log::LevelFilter::Info);
    } else if args.quiet {
        log::init_logger(::log::LevelFilter::Error);
    } else {
        log::init_logger(::log::LevelFilter::Warn);
    }

    if let Err(e) = CommandExecutor::execute(args) {
        output::print_error(&e.to_string());
        std::process::exit(1);
    }
}
